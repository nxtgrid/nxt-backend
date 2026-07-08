/**
 * @fileoverview Redis data access layer for device messages.
 *
 * Data structures used:
 * - Hash: device_message:{id} → message fields (the main entity)
 * - Sorted Set: queue:* → message IDs sorted by priority or timeout
 * - Set: queues_to_distribute_from → list of active initial queues
 * - String: idx:* → lookup indexes (meter_interaction_id, external_delivery_id)
 * - String: lock_queue:* → distributed locks with TTL
 */

import { Redis } from 'iovalkey';
import { ulid } from 'ulid';
import { isEmpty } from 'ramda';
import { CreateDeviceMessageDto } from '../../dto/create-device-message.dto';
import { DeviceMessage, DeviceMessageDeliveryStatus, NetworkServerImplementation, PULL_PATTERN_IMPLEMENTATIONS } from '../types';
import { serializeDeviceMessageDto, deserializeMessage } from './helpers';
import { redisKeys } from './keys';
import { QUEUE_NS_KEY } from '../queue-moving';
import { PUSH_QUEUE_KEYS } from '../queue-moving.push';
import { RAW_QUERIES, FetchNextMessageResult, MoveMessageResult } from '@tiamat/queries';
import { PhaseEnum } from '@core/types/device-messaging';

const ALL_PULL_QUEUE_KEYS: string[] = PULL_PATTERN_IMPLEMENTATIONS.map(redisKeys.queueAwaitingTask);

declare module 'iovalkey' {
  interface Redis {
    /**
     * Atomically fetches the highest priority message from source queue,
     * moves it to destination queue, updates status, and returns message data.
     *
     * @param source_queue - Source sorted set to pop message from (KEYS[1])
     * @param destination_queue - Destination sorted set to move message to (KEYS[2])
     * @param queues_to_distribute_from - Set tracking which queues have work (KEYS[3])
     * @param timeout_at - Unix timestamp for timeout in destination queue (ARGV[1])
     * @param new_status - New delivery status to set on message (ARGV[2])
     * @returns Promise resolving to [messageId, fields[]] or null if queue empty
     */
    fetchNextMessageInQueueAndMove(
      source_queue: string,
      destination_queue: string,
      queues_to_distribute_from: string,
      timeout_at: number | string,
      new_status: DeviceMessageDeliveryStatus
    ): Promise<FetchNextMessageResult>;

    /**
     * Atomically moves a message between queues with a stale-message guard.
     * Only proceeds if the message is present in the source queue (ZREM gate).
     *
     * @param source_queue - Source sorted set (KEYS[1])
     * @param destination_queue - Destination sorted set (KEYS[2])
     * @param message_key - Message hash key (KEYS[3])
     * @param index_key - Optional index key, '' to skip (KEYS[4])
     * @param message_id - Message ULID (ARGV[1])
     * @param destination_score - Score for destination queue (ARGV[2])
     * @param delivery_status - New delivery status (ARGV[3])
     * @param delivery_queue_id - New delivery queue ID, '' to skip (ARGV[4])
     * @param index_ttl_seconds - TTL for index key (ARGV[5])
     * @returns 0 if message not in source queue, 1 if moved
     */
    moveMessageBetweenQueues(
      source_queue: string,
      destination_queue: string,
      message_key: string,
      index_key: string,
      message_id: string,
      destination_score: number | string,
      delivery_status: DeviceMessageDeliveryStatus,
      delivery_queue_id: string,
      index_ttl_seconds: number | string,
    ): Promise<MoveMessageResult>;
  }
}

const { NXT_ENV, HERMES_HOST, HERMES_PORT, HERMES_USERNAME, HERMES_PASSWORD } = process.env;

/**
 * TTL for message hashes and their indexes.
 * Covers max retry time (~4 hours) with generous buffer.
 * Acts as safety net if normal cleanup fails.
 */
export const MESSAGE_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

const _client = new Redis({
  host: HERMES_HOST,
  port: parseInt(HERMES_PORT),
  username: HERMES_USERNAME,
  password: HERMES_PASSWORD,
  // 0 = production, 1 = staging, 2 = development
  db: NXT_ENV === 'production' ? 0 : NXT_ENV === 'staging' ? 1 : 2,
  // 🔑 Required for connection to Digital Ocean
  tls: {},
});

const addScripts = () => {
  _client.defineCommand('fetchNextMessageInQueueAndMove', {
    numberOfKeys: 3,
    lua: RAW_QUERIES.lua.deviceMessages.fetchNextMessageInQueue,
  });
  _client.defineCommand('moveMessageBetweenQueues', {
    numberOfKeys: 4,
    lua: RAW_QUERIES.lua.deviceMessages.moveMessageBetweenQueues,
  });
};
addScripts();

_client.on('connect', () => {
  console.info('[REDIS REPOSITORY :: CONNECTED]');
});

/**
 * Redis repository for device message operations.
 */
export const redisRepo = {
  /** Raw Redis client for advanced operations. */
  client: _client,

  /**
   * Create a new message and add it to the appropriate initial queue.
   * Atomic operation using Redis pipeline.
   *
   * @param dto - Message creation parameters
   * @param queueKey - Initial queue to add message to
   */
  async enqueueDeviceMessage(dto: CreateDeviceMessageDto, queueKey: string) {
    const messageId = ulid();
    const messageKey = redisKeys.message(messageId);

    const serializedHash = serializeDeviceMessageDto(dto);

    // Atomic Execution with pipeline
    const pipeline = _client.pipeline();

    // 1. Store the message data (with TTL as safety net)
    // Becomes:
    //  key: device_message:01ARYZ...
    //  value: { ... data ... }
    pipeline.hset(messageKey, serializedHash);
    pipeline.expire(messageKey, MESSAGE_TTL_SECONDS);

    // 2. Add to the appropriate queue
    // The queue we initially add to is basically the 'bottleneck' for message delivery.
    // The entries are sorted by priority first, and by the "device_message + ULID" second.
    // ⚠️ It becomes CRITICAL that we negate the order, so the first message in the queue
    // is the smallest priority (e.g. -100) and if messages of equal priority are at the top,
    // then pick the oldest message, which is the one with the smallest ULID.
    // Becomes:
    //  key: queue:lorawan_network:42
    //    score: -100
    //    member: 01ARYZ...
    const score = -1 * dto.priority;
    pipeline.zadd(queueKey, score, messageId);

    // 3. Tell the distibutor that there's work to do in this queue
    // Becomes:
    //    key: distributor_queue
    //    member: queue:lorawan_network:42
    pipeline.sadd(redisKeys.listOfInitialQueuesToDistributeFrom(), queueKey);

    // 4. We want to create some indexes for quick lookup of the hash (with TTL)
    // Becomes:
    //  key: idx:meter_interaction:6321 (or idx:meter_interaction:6321_phA for phase if provided)
    //  value: device_message:01ARYZ...
    if(dto.meter_interaction_id) {
      // Include phase in the index key for three-phase meters
      const indexKey = redisKeys.indexMeterInteractionId(dto.meter_interaction_id, dto.phase);
      pipeline.set(indexKey, messageKey, 'EX', MESSAGE_TTL_SECONDS);
    }

    await pipeline.exec();
  },

  /**
   * Move a message from retry queue back to an initial queue.
   * Restores priority-based ordering and marks as QUEUED.
   *
   * @param messageId - ULID of the message
   * @param fromQueueKey - Source queue (typically retry queue)
   * @param toQueueKey - Destination initial queue
   * @param priority - Original message priority
   */
  async requeueMessage(messageId: string, fromQueueKey: string, toQueueKey: string, priority: number) {
    const pipeline = _client.pipeline();

    pipeline.zrem(fromQueueKey, messageId);
    const score = -1 * priority;
    pipeline.zadd(toQueueKey, score, messageId);
    pipeline.sadd(redisKeys.listOfInitialQueuesToDistributeFrom(), toQueueKey);
    pipeline.hset(redisKeys.message(messageId), { delivery_status: 'QUEUED' });

    await pipeline.exec();
  },

  /**
   * Get all initial queues that have messages waiting to be distributed.
   * @returns Array of queue keys (e.g., ['queue:lorawan_network:42', ...])
   */
  fetchQueuesWithMessages() {
    return _client.smembers(redisKeys.listOfInitialQueuesToDistributeFrom());
  },

  /**
   * Acquire a time-limited distributed lock on a queue.
   * Uses SET NX PX for atomic lock with automatic expiry.
   *
   * @param queueKey - Lock key for the queue
   * @param durationMs - Lock duration in milliseconds
   * @returns 'OK' if lock acquired, null if already locked
   */
  lockQueueForTimeMs(queueKey: string, durationMs: number) {
    return _client.set(queueKey, 'locked', 'PX', durationMs, 'NX');
  },

  /**
   * Look up a message ID by its external delivery queue ID (from ChirpStack).
   *
   * @param deliveryQueueId - External queue ID
   * @returns Message ULID or undefined if not found
   */
  async getMessageIdFromDeliveryQueueId(deliveryQueueId: string) {
    const messageKey = await _client.get(redisKeys.indexExternalDeliveryId(deliveryQueueId));
    return messageKey?.split(':')[1];
  },

  /**
   * Retrieve a full message by its ULID.
   *
   * @param messageId - Message ULID
   * @returns Deserialized DeviceMessage or null if not found
   */
  async getMessageById(messageId: string): Promise<DeviceMessage | null> {
    const raw = await _client.hgetall(redisKeys.message(messageId));
    // hgetall returns an empty object when key doesn't exist
    if (isEmpty(raw)) return null;
    return deserializeMessage(messageId, raw);
  },

  /**
   * Retrieve specific raw properties from a message hash.
   * More efficient than getMessageById when only a few fields are needed.
   *
   * @param messageId - Message ULID
   * @param props - Array of property names to retrieve
   * @returns Array of raw string values (null for missing props)
   */
  getMessageRawPropsById(messageId: string, props: string[]) {
    return _client.hmget(redisKeys.message(messageId), ...props);
  },

  /**
   * Look up a message by its associated meter interaction ID.
   *
   * @param meterInteractionId - Meter interaction ID
   * @returns DeviceMessage or null if not found
   */
  async getMessageFromMeterInteractionId(meterInteractionId: number) {
    const messageKey = await _client.get(redisKeys.indexMeterInteractionId(meterInteractionId));
    const messageId = messageKey?.split(':')[1];
    if(!messageId) return null;
    return this.getMessageById(messageId);
  },

  /**
   * Look up all messages by meter interaction ID (for three-phase aggregation).
   * Checks base index and all phase-specific indexes.
   *
   * @param meterInteractionId - Meter interaction ID
   * @returns Array of DeviceMessages (1 for single-phase, up to 3 for three-phase)
   */
  async getAllMessagesForMeterInteraction(meterInteractionId: number): Promise<DeviceMessage[]> {
    const phases: (PhaseEnum | undefined)[] = [ undefined, 'A', 'B', 'C' ];
    const indexKeys = phases.map(phase => redisKeys.indexMeterInteractionId(meterInteractionId, phase));

    const messageKeys = (await _client.mget(...indexKeys)).filter(Boolean) as string[];
    if (isEmpty(messageKeys)) return [];

    const pipeline = _client.pipeline();
    messageKeys.forEach(key => pipeline.hgetall(key));
    const results = await pipeline.exec();

    const messages: DeviceMessage[] = [];
    results.forEach(([ err, raw ], i) => {
      if (err || isEmpty(raw)) return;
      const messageId = messageKeys[i].split(':')[1];
      messages.push(deserializeMessage(messageId, raw as Record<string, string>));
    });

    return messages;
  },
  // async _getAllMessagesForMeterInteraction(meterInteractionId: number): Promise<DeviceMessage[]> {
  //   const phases: (PhaseEnum | undefined)[] = [ undefined, 'A', 'B', 'C' ];
  //   const indexKeys = phases.map(phase => redisKeys.indexMeterInteractionId(meterInteractionId, phase));

  //   const messageKeys = await _client.mget(...indexKeys);

  //   const messages: DeviceMessage[] = [];
  //   for (const messageKey of messageKeys) {
  //     if (!messageKey) continue;
  //     const messageId = messageKey.split(':')[1];
  //     const message = await this.getMessageById(messageId);
  //     if (message) messages.push(message);
  //   }

  //   return messages;
  // },

  /**
   * Get all message IDs from a queue (sorted set).
   *
   * @param queueKey - Queue to read from
   * @returns Array of message IDs
   */
  getAllMessageIdsInQueue(queueKey: string) {
    // @NOTE :: Weird zrange type definition doesn't let us pass -1 as a number
    return _client.zrange(queueKey, 0, '-1');
  },

  /**
   * Find messages that have exceeded their timeout in a queue.
   * Uses sorted set scores as timeout timestamps.
   *
   * @param queueKey - Queue to scan
   * @param cutoffDate - Unix timestamp; messages with score <= this are expired
   * @returns Array of message IDs (max 50 per call)
   */
  getExpiredMessagesInQueue(queueKey: string, cutoffDate: number) {
    return _client.zrangebyscore(queueKey, '-inf', cutoffDate, 'LIMIT', 0, 50);
  },

  /**
   * Get messages due for polling in a PULL pattern queue.
   * Returns messages whose score (next poll time) is <= now.
   *
   * @param queueKey - Queue to scan
   * @returns Array of message IDs due for polling (max 50 per call)
   */
  getMessagesDueForPolling(queueKey: string) {
    return _client.zrangebyscore(queueKey, '-inf', Date.now(), 'LIMIT', 0, 50);
  },

  /**
   * Update the next poll time for a message in a PULL pattern queue.
   * Uses XX flag to only update if the member exists (prevents race conditions).
   *
   * @param queueKey - Queue containing the message
   * @param messageId - Message ULID
   * @param nextPollAt - Unix timestamp for next poll
   */
  updateNextPollTime(queueKey: string, messageId: string, nextPollAt: number) {
    return _client.zadd(queueKey, 'XX', nextPollAt, messageId);
  },

  /**
   * Remove a message from a specific queue.
   *
   * @param queueKey - Queue to remove from
   * @param messageId - Message ULID to remove
   */
  removeMessageFromQueue(queueKey: string, messageId: string) {
    return _client.zrem(queueKey, messageId);
  },

  /**
   * Complete cleanup of a message from all Redis structures.
   * Called on successful delivery or permanent failure.
   * Removes: message hash, all queue entries, all indexes.
   *
   * @param message - The message to clean up
   */
  async messageFullCleanup(message: DeviceMessage) {
    const messageKey = redisKeys.message(message.id);
    const indexesToDelete = [
      message.meter_interaction_id && redisKeys.indexMeterInteractionId(message.meter_interaction_id, message.phase),
      message.delivery_queue_id && redisKeys.indexExternalDeliveryId(message.delivery_queue_id),
    ].filter(Boolean);

    const pipeline = _client.multi();

    // 1. Delete the message
    pipeline.del(messageKey);

    // 2. Remove from Queue (shotgun on all queues)
    // Shared NS queue
    pipeline.zrem(QUEUE_NS_KEY, message.id);
    // PUSH pattern queues
    PUSH_QUEUE_KEYS.forEach((queueKey: string) => {
      pipeline.zrem(queueKey, message.id);
    });
    // PULL pattern queues
    if (message.device) {
      const implementation = `${ message.device.manufacturer }_${ message.device.protocol }` as NetworkServerImplementation;
      pipeline.zrem(redisKeys.queueAwaitingTask(implementation), message.id);
    }
    else {
      // Phantom entry with no device data — shotgun ZREM on all known PULL queues
      ALL_PULL_QUEUE_KEYS.forEach((queueKey: string) => {
        pipeline.zrem(queueKey, message.id);
      });
    }

    // 3. Clean up rate limiting (PULL pattern only, safe no-op for PUSH)
    if (message.device?.gateway?.id) {
      pipeline.srem(redisKeys.gatewayRateLimit(message.device.gateway.id), message.id);
    }

    // 4: Delete Indexes
    indexesToDelete.forEach((indexKey: string) => {
      pipeline.del(indexKey);
    });

    await pipeline.exec();
  },

  // ------------------------------------
  // Gateway Rate Limiting (PULL pattern)
  // ------------------------------------

  /**
   * Add a message to a gateway's rate limit tracking set.
   * Called when a message is successfully sent to the external API.
   *
   * @param gatewayId - The gateway ID
   * @param messageId - The message ULID
   */
  addToGatewayRateLimit(gatewayId: number, messageId: string) {
    return _client.sadd(redisKeys.gatewayRateLimit(gatewayId), messageId);
  },

  /**
   * Get the count of messages currently tracked at a gateway.
   * Used to check if we can send more messages.
   *
   * @param gatewayId - The gateway ID
   * @returns Number of messages tracked
   */
  getGatewayRateLimitCount(gatewayId: number) {
    return _client.scard(redisKeys.gatewayRateLimit(gatewayId));
  },

  /**
   * Validate and clean a gateway's rate limit set by removing members
   * whose message hash no longer exists. Only call when the set is at
   * capacity to avoid unnecessary work.
   *
   * @param gatewayId - The gateway ID
   * @returns Number of live members remaining after cleanup
   */
  async validateAndCleanGatewayRateLimit(gatewayId: number): Promise<number> {
    const rateLimitKey = redisKeys.gatewayRateLimit(gatewayId);
    const members = await _client.smembers(rateLimitKey);
    if (members.length === 0) return 0;

    const existsPipeline = _client.pipeline();
    for (const messageId of members) {
      existsPipeline.exists(redisKeys.message(messageId));
    }
    const results = await existsPipeline.exec();

    const deadMembers = members.filter((_member, idx) => {
      const [ err, exists ] = results[idx];
      return !err && exists === 0;
    });

    if (deadMembers.length > 0) {
      await _client.srem(rateLimitKey, ...deadMembers);
      console.warn(`[REDIS] Cleaned ${ deadMembers.length } dead entries from rate_limit:gateway:${ gatewayId }`);
    }

    return members.length - deadMembers.length;
  },
};
