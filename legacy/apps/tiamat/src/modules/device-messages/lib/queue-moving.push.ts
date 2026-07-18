/**
 * @fileoverview PUSH pattern queue transitions (webhook-based, e.g., LoRaWAN/ChirpStack).
 *
 * PUSH pattern message flow after NS acceptance:
 *
 *   queue_in_flight_to_ns
 *         ↓ fromNsToGw
 *   queue_in_flight_to_gw (timeout: 15min) - awaiting gateway ACK
 *         ↓ fromGwToDevice
 *   queue_in_flight_to_device (timeout: 12s) - awaiting device response
 *         ↓ success or failure
 *   [cleanup] or [queue_awaiting_retry]
 */

import { redisRepo } from './redis-repository';
import { redisKeys } from './redis-repository/keys';
import { DeviceMessage } from './types';
import { _moveQueue, QueueConfig, QUEUE_NS_KEY } from './queue-moving';

/** Gateway queue: awaiting gateway to transmit downlink and send ACK. */
const CONFIG_QUEUE_GW: QueueConfig = {
  KEY: 'queue_in_flight_to_gw',
  PROCESSING_TIMEOUT_MS: 900_000, // 15 minutes, edge case check
  MESSAGE_STATUS: 'DELIVERED_TO_NS',
};

/** Device queue: awaiting device response after transmission. */
const CONFIG_QUEUE_DEVICE: QueueConfig = {
  KEY: 'queue_in_flight_to_device',
  PROCESSING_TIMEOUT_MS: 12_000, // 12 seconds
  MESSAGE_STATUS: 'SENT_TO_DEVICE',
};

/** Exported key for Gateway queue. */
export const QUEUE_GW_KEY = CONFIG_QUEUE_GW.KEY;

/** Exported key for Device queue. */
export const QUEUE_DEVICE_KEY = CONFIG_QUEUE_DEVICE.KEY;

/** PUSH pattern in-flight queue keys (for timeout scanning). */
export const PUSH_QUEUE_KEYS = [
  CONFIG_QUEUE_GW.KEY,
  CONFIG_QUEUE_DEVICE.KEY,
];

/** Human-readable timeout reasons for each PUSH queue stage. */
export const PUSH_TIMEOUT_REASONS: Record<string, string> = {
  'queue_in_flight_to_gw': 'Timed out waiting for Network Server / Gateway to transmit message to device',
  'queue_in_flight_to_device': 'Timed out waiting for device response after transmission',
};

/**
 * PUSH pattern queue transitions.
 */
export const moveQueuePush = {
  /**
   * Move message from NS queue to Gateway queue after NS accepts the downlink.
   * Creates an index for looking up the message by external delivery ID.
   *
   * @param id - Message ULID
   * @param delivery_queue_id - External queue ID from ChirpStack
   */
  fromNsToGw({ id, delivery_queue_id }: Partial<DeviceMessage>) {
    const timesOutAt = Date.now() + CONFIG_QUEUE_GW.PROCESSING_TIMEOUT_MS;
    return _moveQueue(
      id,
      QUEUE_NS_KEY,
      CONFIG_QUEUE_GW.KEY,
      timesOutAt,
      { delivery_status: CONFIG_QUEUE_GW.MESSAGE_STATUS, delivery_queue_id },
      redisKeys.indexExternalDeliveryId(delivery_queue_id),
    );
  },

  /**
   * Move message from Gateway queue to Device queue after gateway ACK.
   * Called when we receive confirmation that gateway transmitted the downlink.
   *
   * @param id - Message ULID
   */
  fromGwToDevice({ id }: Partial<DeviceMessage>) {
    const timesOutAt = Date.now() + CONFIG_QUEUE_DEVICE.PROCESSING_TIMEOUT_MS;
    return _moveQueue(
      id,
      CONFIG_QUEUE_GW.KEY,
      CONFIG_QUEUE_DEVICE.KEY,
      timesOutAt,
      { delivery_status: CONFIG_QUEUE_DEVICE.MESSAGE_STATUS },
    );
  },

  /**
   * Extend the timeout for a message in the Gateway queue.
   * Used when the message is still queued remotely and we need to wait longer.
   *
   * Uses XX flag to only update if member exists, preventing a race condition
   * where an incoming webhook moves the message to the device queue between
   * the remote status check and this call.
   *
   * @param messageId - ULID of the message
   */
  extendGwQueueTimeout(messageId: string) {
    const newTimesOutAt = Date.now() + CONFIG_QUEUE_GW.PROCESSING_TIMEOUT_MS;
    return redisRepo.client.zadd(CONFIG_QUEUE_GW.KEY, 'XX', newTimesOutAt, messageId);
  },
};
