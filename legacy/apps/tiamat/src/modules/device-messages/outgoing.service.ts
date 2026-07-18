import { Injectable, OnModuleInit } from '@nestjs/common';
import { CalinLorawanOutgoingService } from './adapters/calin-lorawan/_outgoing.service';
import { CalinApiV1OutgoingService } from './adapters/calin-api-v1/_outgoing.service';
import { CalinApiV2OutgoingService } from './adapters/calin-api-v2/_outgoing.service';
import { DeviceMessagesService } from './device-messages.service';
import { CancelMessageResult, DeviceManufacturerEnum, DeviceMessage, DeviceProtocolEnum, NetworkServerImplementation, PULL_PATTERN_IMPLEMENTATIONS } from './lib/types';
import { Cron } from '@nestjs/schedule';
import { CreateDeviceMessageDto } from './dto/create-device-message.dto';
import { redisRepo } from './lib/redis-repository';
import { redisKeys } from './lib/redis-repository/keys';
import { QUEUE_NS_KEY, QUEUE_RETRY_KEY, moveQueue } from './lib/queue-moving';
import { moveQueuePush, QUEUE_GW_KEY } from './lib/queue-moving.push';
import { moveQueuePull } from './lib/queue-moving.pull';
import { getPushTimeouts, maybeExtendMessageInGwQueue } from './lib/lifecycle.push';
import { getPullTimeouts, PULL_MAX_CONCURRENT_PER_GATEWAY } from './lib/lifecycle.pull';

/** Minimum interval between LoRaWAN downlinks to prevent network flooding. */
const LORAWAN_FLOOD_PREVENTION_WINDOW_MS = 2000;

/**
 * Service responsible for sending messages to devices via network servers.
 *
 * Key responsibilities:
 * - Enqueue new messages for delivery
 * - Distribute messages to appropriate network servers (rate-limited)
 * - Run periodic "reaper" cycle to handle timeouts and retries
 */
@Injectable()
export class DeviceMessageOutgoingService extends DeviceMessagesService implements OnModuleInit {
  constructor(
    private readonly calinLorawanOutgoingService: CalinLorawanOutgoingService,
    private readonly calinApiV1OutgoingService: CalinApiV1OutgoingService,
    private readonly calinApiV2OutgoingService: CalinApiV2OutgoingService,
  ) { super(); }

  onModuleInit() {
    // setTimeout(() => {
    //   this.enqueue({
    //     priority: 90,
    //     grid_id: 60,
    //     meter_interaction_id: 102,
    //     message_type: 'READ_VOLTAGE',
    //     device: {
    //       type: 'ELECTRICITY_METER',
    //       protocol: 'LORAWAN',
    //       manufacturer: 'CALIN',
    //       external_reference: '47003333623',
    //     },
    //   });
    // }, 1000);
  }

  /**
   * Map of network server implementations to their adapter services.
   * Add new adapters here when supporting new manufacturers/protocols.
   */
  private ROUTE_MAP = {
    CALIN_LORAWAN: this.calinLorawanOutgoingService,
    CALIN_API_V1: this.calinApiV1OutgoingService,
    CALIN_API_V2: this.calinApiV2OutgoingService,
  };

  /**
   * Get the appropriate adapter for a device based on protocol and manufacturer.
   * @param manufacturer - Device manufacturer (e.g., 'CALIN')
   * @param protocol - Communication protocol (e.g., 'LORAWAN')
   * @returns The adapter service for sending messages
   * @throws Error if no adapter found for the combination
   */
  private getAdapter(manufacturer: DeviceManufacturerEnum, protocol: DeviceProtocolEnum) {
    if(!manufacturer || !protocol)
      throw new Error('Can\'t communicate with Network Server without manufacturer and protocol');
    const implementation = (manufacturer + '_' + protocol) as NetworkServerImplementation;
    const route = this.ROUTE_MAP[implementation];
    if(!route)
      throw new Error(`Can't find Network Server adapter for manufacturer ${ manufacturer } and protocol ${ protocol }.`);
    return route;
  }

  /**
   * Enqueue a new message for delivery.
   *
   * The message is placed in a protocol-specific initial queue based on
   * the device's  manufacturer and . Distribution is triggered
   * immediately after enqueueing.
   *
   * @param createMessageDto - Message creation parameters
   */
  enqueue(createMessageDto: CreateDeviceMessageDto) {
    // Select queue based on device manufacturer/protocol (different bottlenecks)
    const initialQueue = redisKeys.queueInitial(createMessageDto);
    if(!initialQueue) {
      console.warn(`
        [DEVICE MESSAGES OUTGOING] We don't have a Redis queue for a device with manufacturer
        ${ createMessageDto.device.manufacturer } and protocol ${ createMessageDto.device.protocol }.
      `);
      return;
    }
    redisRepo.enqueueDeviceMessage(createMessageDto, initialQueue);

    // On every enqueue we try to distribute
    this.distributeToNetworkServers();
  }

  /**
   * Process all initial queues and send messages to their network servers.
   *
   * Distribution strategy varies by implementation:
   * - LoRaWAN: Rate-limited (one message per 2s per network) to prevent flooding
   * - Future protocols may have different constraints (DCU limits, no queue, etc.)
   *
   * Uses distributed locking to prevent concurrent sends to the same network.
   */
  async distributeToNetworkServers() {
    // 1. Get the list of Redis queues that have work
    const activeQueues = await redisRepo.fetchQueuesWithMessages();

    const _promises = activeQueues.map(async queueKey => {
      // 2. For every queue, check if we meet the criteria to continue
      const [ _queuePrefix, queueType , queueTypeId ] = queueKey.split(':');
      if(queueType === 'lorawan_network') {
        // In the case of LoRaWAN networks, we don't want to flood the network,
        // so we lock the queue for LORAWAN_FLOOD_PREVENTION_WINDOW_MS amount of milliseconds.
        // The lock automatically expires after that time, so if we 'acquire' the lock,
        // we can continue, otherwise we'll have to wait for the next run.
        const lockKey = redisKeys.lockForQueue(queueKey);
        const lockAcquired = await redisRepo.lockQueueForTimeMs(lockKey, LORAWAN_FLOOD_PREVENTION_WINDOW_MS);
        if(!lockAcquired) return;
      }
      if(queueType === 'gateway') {
        // Gateway rate limiting: don't send if too many messages are queued at gateway
        const gatewayId = parseInt(queueTypeId);
        const tracked = await redisRepo.getGatewayRateLimitCount(gatewayId);
        if (tracked >= PULL_MAX_CONCURRENT_PER_GATEWAY) {
          // Self-heal: validate rate limit members against existing message hashes.
          // Removes dead entries (e.g. from phantom messages) so the gateway unblocks.
          const liveCount = await redisRepo.validateAndCleanGatewayRateLimit(gatewayId);
          if (liveCount >= PULL_MAX_CONCURRENT_PER_GATEWAY) return;
        }
      }
      // 3. Fetch the next message in the appropriate queue (and move it to the NS queue)
      //    This does an atomic operation, so the state of the message is also changed to 'SENT_TO_NS'
      const messageToSend = await moveQueue.pickNextAndMoveToNs(queueKey);
      if(!messageToSend) return;

      // 4. For gateway (PULL/API) queues, claim a rate limit slot before the API call.
      //    This caps concurrent in-flight API requests per gateway, preventing slow
      //    external APIs from being flooded with parallel calls. The slot is released
      //    on success (messageFullCleanup), retry (fromAnyToRetry), or final failure.
      if (queueType === 'gateway') {
        await redisRepo.addToGatewayRateLimit(parseInt(queueTypeId), messageToSend.id);
      }

      // If not a retry, publish to subscribers that the message is getting handled.
      // (The message status is already 'SENT_TO_NS')
      if(!messageToSend.retry_count) this.publish(messageToSend);

      // No await, we consider this done when we have picked a message and handed it off
      this.sendOneToNetworkServer(messageToSend);
    });

    await Promise.all(_promises);
  }

  /**
   * Send a single message to its network server via the appropriate adapter.
   *
   * On success: moves message to appropriate next queue based on pattern.
   * On failure: triggers retry/fail logic.
   *
   * @param message - The message to send
   */
  private async sendOneToNetworkServer(message: DeviceMessage) {
    const _adapter = this.getAdapter(message.device.manufacturer, message.device.protocol);

    let delivery_queue_id: string;
    const startedAt = performance.now();

    try {
      delivery_queue_id = await _adapter.sendOne(message);
    }
    catch(err) {
      const elapsedMs = Math.round(performance.now() - startedAt);
      if (elapsedMs > 20_000) {
        console.warn(`[NS_SLOW] sendOne for meter ${ message.device.external_reference } (interaction ${ message.meter_interaction_id }, msg ${ message.id }) took ${ elapsedMs }ms before throwing`, err);
      }
      const failureContext = _adapter.parseError(err);
      await this.retryOrFail(message.id, QUEUE_NS_KEY, failureContext);
      return;
    }

    const elapsedMs = Math.round(performance.now() - startedAt);
    if (elapsedMs > 20_000) {
      console.warn(`[NS_SLOW] sendOne for meter ${ message.device.external_reference } (interaction ${ message.meter_interaction_id }, msg ${ message.id }) took ${ elapsedMs }ms — resolution cycle may have already scheduled a retry`);
    }

    if(delivery_queue_id) {
      // Branch based on communication pattern: PUSH (webhook) vs PULL (polling)
      const implementation = `${ message.device.manufacturer }_${ message.device.protocol }` as NetworkServerImplementation;

      if (PULL_PATTERN_IMPLEMENTATIONS.includes(implementation)) {
        await moveQueuePull.fromNsToAwaitingTask({
          id: message.id,
          delivery_queue_id,
          implementation,
        });
      }
      else {
        await moveQueuePush.fromNsToGw({ id: message.id, delivery_queue_id });
      }
    }
  }

  /**
   * Periodic job that handles message lifecycle management.
   *
   * Runs every 2 seconds in production and performs:
   * 1. Shared: NS queue timeout scanning (pre-pattern)
   * 2. PUSH pattern: GW + Device timeout scanning + GW extension
   * 3. PULL pattern: age-based timeout (permanent failure)
   * 4. Retry queue: requeue backed-off messages
   * 5. Trigger distribution cycle
   */
  @Cron('*/2 * * * * *',
    { disabled: process.env.NXT_ENV !== 'production' },
  )
  async runMessageResolutionCycle() {
    const _now = Date.now();

    // 1. Shared: NS queue timeout (applies to both PUSH and PULL before branching)
    const nsZombieIds = await redisRepo.getExpiredMessagesInQueue(QUEUE_NS_KEY, _now);
    for (const messageId of nsZombieIds) {
      await this.retryOrFail(messageId, QUEUE_NS_KEY, {
        reason: 'Timed out waiting for Network Server to accept message',
      });
    }

    // 2. PUSH pattern: handle GW + Device timeouts
    const pushTimeouts = await getPushTimeouts(_now);
    for (const { messageId, queueKey, reason } of pushTimeouts) {
      // GW queue: check remote status before retrying
      if (queueKey === QUEUE_GW_KEY) {
        const message = await redisRepo.getMessageById(messageId);
        if (message) {
          const adapter = this.getAdapter(message.device.manufacturer, message.device.protocol);
          const extended = await maybeExtendMessageInGwQueue(messageId, message, adapter);
          if (extended) continue;
        }
      }
      await this.retryOrFail(messageId, queueKey, { reason });
    }

    // 3. PULL pattern: handle age-based timeouts (permanent failure)
    const pullTimeouts = await getPullTimeouts(_now);
    for (const { message } of pullTimeouts) {
      this.publish(message);
    }

    // 4. Move backed-off messages from retry queue back to ready queue
    // They are 'expired' because their wait time has expired
    const readyToRetryIds = await redisRepo.getExpiredMessagesInQueue(QUEUE_RETRY_KEY, _now);
    for (const messageId of readyToRetryIds) {
      await this.requeueMessage(messageId);
    }

    this.distributeToNetworkServers();
  }

  /**
   * Get the current delivery status of a message by its meter interaction ID.
   * Returns the full device message from Redis if found.
   *
   * @param meterInteractionId - The meter interaction ID to look up
   * @returns DeviceMessage or null if not found in Redis (already completed/failed)
   */
  getMessageByMeterInteractionId(meterInteractionId: number) {
    return redisRepo.getMessageFromMeterInteractionId(meterInteractionId);
  }

  /**
   * Cancel a single device message by its meter interaction ID.
   *
   * Only messages in QUEUED or TO_RETRY state can be cancelled -- anything
   * further along the pipeline has already been handed off to the network server.
   * Uses atomic ZREM as a "claim" to prevent race conditions with the distributor
   * and the reaper cycle.
   *
   * @param meterInteractionId - The meter interaction ID to cancel
   * @returns Result indicating whether the message was cancelled, not cancellable, or not found
   */
  async cancelOneByMeterInteractionId(meterInteractionId: number): Promise<CancelMessageResult> {
    const messages = await redisRepo.getAllMessagesForMeterInteraction(meterInteractionId);

    if (messages.length === 0) {
      return { meter_interaction_id: meterInteractionId, result: 'NOT_FOUND' };
    }

    const outcomes = await Promise.all(messages.map(message => this.cancelOneMessage(message)));

    const allCancelled = outcomes.every(Boolean);
    const result = allCancelled ? 'CANCELLED' : 'NOT_CANCELLABLE';

    return { meter_interaction_id: meterInteractionId, result };
  }

  /**
   * Cancel multiple device messages by their meter interaction IDs.
   *
   * @performance Current approach: O(N) Redis round-trips (~4 per ID). Acceptable
   * for typical batch sizes (<50). For large batches (hundreds), the lookup phase
   * can be batched: collect all index keys (base + phases A/B/C per ID) into a
   * single MGET, then pipeline the HGETALLs. This cuts lookup round-trips from
   * 2N to 2. The per-message cancel loop (ZREM claim + messageFullCleanup) should
   * stay sequential to preserve the atomic claim semantics.
   *
   * @param meterInteractionIds - Array of meter interaction IDs to cancel
   * @returns Array of results, one per ID
   */
  async cancelManyByMeterInteractionIds(meterInteractionIds: number[]): Promise<CancelMessageResult[]> {
    return Promise.all(meterInteractionIds.map(id => this.cancelOneByMeterInteractionId(id)));
  }

  /**
   * Attempt to cancel a single device message from its current queue.
   *
   * Uses ZREM as an atomic claim: if ZREM returns 1 we own the message and
   * proceed with full cleanup. If it returns 0 the message has already been
   * picked up by the distributor or reaper, so we leave it alone.
   *
   * @param message - The device message to cancel
   * @returns true if the message was successfully removed, false otherwise
   */
  private async cancelOneMessage(message: DeviceMessage): Promise<boolean> {
    const { delivery_status } = message;

    if (delivery_status !== 'QUEUED' && delivery_status !== 'TO_RETRY') {
      return false;
    }

    const queueKey = delivery_status === 'TO_RETRY'
      ? QUEUE_RETRY_KEY
      : redisKeys.queueInitial(message);

    if (!queueKey) return false;

    const removed = await redisRepo.client.zrem(queueKey, message.id);

    if (removed === 0) return false;

    await redisRepo.messageFullCleanup(message);

    return true;
  }
}
