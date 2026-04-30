import { isNotNil } from 'ramda';
import { moveQueue, QUEUE_RETRY_KEY } from './lib/queue-moving';
import { redisRepo } from './lib/redis-repository';
import { redisKeys } from './lib/redis-repository/keys';
import { MAX_RETRIES, calculateBackoffDelay } from './lib/retry-helpers';
import { DeviceMessage, DeviceMessageDeliveryStatus, FailureContext, FailureReason } from './lib/types';

/**
 * Base service for device message handling.
 *
 * Provides core functionality shared between incoming and outgoing services:
 * - Pub/sub mechanism for message status updates
 * - Retry logic with exponential backoff
 * - Message requeuing after backoff period
 *
 * @abstract Extended by DeviceMessageOutgoingService and DeviceMessageIncomingService
 */
export class DeviceMessagesService {
  /**
   * Static list of subscriber callbacks.
   * All instances share the same subscribers.
   */
  private static subscribers = [];

  /**
   * Notify all subscribers of a message update.
   * @param message - The message (or partial) to broadcast
   */
  protected publish(message: Partial<DeviceMessage>) {
    DeviceMessagesService.subscribers.forEach(fn => { fn(message); });
  }

  /**
   * Register a callback to receive message updates.
   * @param fn - Async callback invoked on each publish
   */
  public subscribe(fn: (message: DeviceMessage) => Promise<void>) {
    DeviceMessagesService.subscribers = [ ...DeviceMessagesService.subscribers, fn ];
  }

  /**
   * Handle a failed delivery attempt by either scheduling a retry or failing permanently.
   *
   * Decision logic:
   * - If skipRetry is true: fail immediately (unrecoverable error)
   * - If retry_count >= MAX_RETRIES: clean up and publish failure
   * - Otherwise: schedule retry with exponential backoff
   *
   * @param messageId - ULID of the message
   * @param currentQueueKey - The queue where the message currently resides
   * @param failureContext - Details about why the failure occurred
   */
  protected async retryOrFail(
    messageId: string,
    currentQueueKey: string,
    failureContext: FailureContext,
  ): Promise<void> {
    const message = await redisRepo.getMessageById(messageId);

    if (!message) {
      await redisRepo.removeMessageFromQueue(currentQueueKey, messageId);
      return;
    }

    const currentRetryCount = message.retry_count ?? 0;
    const isFinalFailure = failureContext.skipRetry || currentRetryCount >= MAX_RETRIES;
    const newFailureHistory: FailureReason[] = [
      {
        timestamp: (new Date()).toISOString(),
        status: message.delivery_status,
        reason: failureContext.reason,
        ...(isNotNil(failureContext.errorCode) && { errorCode: failureContext.errorCode }),
        ...(failureContext.details && { details: failureContext.details }),
        isFinal: isFinalFailure,
      },
      ...(message.failure_history ?? []),
    ];

    if (isFinalFailure) {
      await redisRepo.messageFullCleanup(message);
      this.publish({
        ...message,
        failure_history: newFailureHistory,
        delivery_status: 'DELIVERY_FAILED',
      });
      return;
    }

    // RETRY otherwise
    const backoffMs = calculateBackoffDelay(currentRetryCount);
    const newRetryCount = currentRetryCount + 1;
    const nextRetryAt = Date.now() + backoffMs;

    // console.info(`[RETRY_OR_FAIL] Scheduling retry ${ newRetryCount }/${ MAX_RETRIES } for message ${ messageId } failing at ${ message.delivery_status }. Next retry in ${ Math.round(backoffMs / 1000) }s`);

    const updateProps = {
      retry_count: newRetryCount,
      delivery_status: 'TO_RETRY' as DeviceMessageDeliveryStatus,
      failure_history: newFailureHistory,
    };

    await moveQueue.fromAnyToRetry(
      messageId,
      currentQueueKey,
      nextRetryAt,
      updateProps,
    );

    // Perhaps publish, let's check
    // this.publish({ ...message, ...updateProps });
  }

  /**
   * Move a message from the retry queue back to its initial queue.
   * Called when the backoff period has elapsed and the message is ready for another attempt.
   *
   * @param messageId - ULID of the message to requeue
   */
  protected async requeueMessage(messageId: string) {
    // Get the hash props needed to requeue
    const [ priorityStr, deviceStr, gridIdStr ] = await redisRepo.getMessageRawPropsById(messageId, [ 'priority', 'device', 'grid_id' ]);
    if (!priorityStr || !deviceStr || !gridIdStr) {
      console.warn(`[REDIS] 👻 Orphaned ID ${ messageId }. Removing.`);
      await redisRepo.removeMessageFromQueue(QUEUE_RETRY_KEY, messageId);
      return;
    }

    // Recreate the necessary properties for queueing logic
    const priority = parseInt(priorityStr);
    const grid_id = parseInt(gridIdStr);
    const device = JSON.parse(deviceStr);
    const destinationQueue = redisKeys.queueInitial({ device, grid_id });

    // Requeue the message
    await redisRepo.requeueMessage(messageId, QUEUE_RETRY_KEY, destinationQueue, priority);

    // Perhaps publish, let's check
    // this.publish({ ...message, ...updateProps });
  }
}
