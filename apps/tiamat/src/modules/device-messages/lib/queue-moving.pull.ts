/**
 * @fileoverview PULL pattern queue transitions (polling-based, e.g., CALIN API V1/V2).
 *
 * PULL pattern message flow after NS acceptance:
 *
 *   queue_in_flight_to_ns
 *         ↓ fromNsToAwaitingTask
 *   queue_awaiting_task:CALIN_API_V1 (score = next poll time)
 *         ↓ polled until success or failure
 *   [cleanup] or [queue_awaiting_retry]
 *
 * For PULL pattern, the sorted set score represents "next poll time" (not timeout).
 * Timeout is handled separately via message age check.
 */

import { redisKeys } from './redis-repository/keys';
import { DeviceMessageDeliveryStatus, NetworkServerImplementation } from './types';
import { _moveQueue, QUEUE_NS_KEY } from './queue-moving';

/** Awaiting task queue config for PULL pattern adapters. */
const CONFIG_QUEUE_AWAITING_TASK = {
  /** Delay before first poll - messages rarely respond before 10s */
  INITIAL_POLL_DELAY_MS: 10_000,
  /** Message status when in this queue */
  MESSAGE_STATUS: 'DELIVERED_TO_NS' as DeviceMessageDeliveryStatus,
};

/**
 * PULL pattern queue transitions.
 */
export const moveQueuePull = {
  /**
   * Move message from NS queue to Awaiting Task queue for PULL pattern implementations.
   * Used when the external API accepts our request and returns a task ID.
   * The message will be polled until the task completes.
   *
   * Note: For PULL pattern, the score represents "next poll time" (not timeout).
   *
   * @param id - Message ULID
   * @param delivery_queue_id - External task ID from the API (e.g., CALIN TaskNo)
   * @param implementation - The implementation (determines which queue)
   */
  async fromNsToAwaitingTask({ id, delivery_queue_id, implementation }: {
    id: string;
    delivery_queue_id: string;
    implementation: NetworkServerImplementation;
  }) {
    const queueKey = redisKeys.queueAwaitingTask(implementation);
    const firstPollAt = Date.now() + CONFIG_QUEUE_AWAITING_TASK.INITIAL_POLL_DELAY_MS;
    await _moveQueue(
      id,
      QUEUE_NS_KEY,
      queueKey,
      firstPollAt, // Score = next poll time
      { delivery_status: CONFIG_QUEUE_AWAITING_TASK.MESSAGE_STATUS, delivery_queue_id },
      redisKeys.indexExternalDeliveryId(delivery_queue_id),
    );
  },
};
