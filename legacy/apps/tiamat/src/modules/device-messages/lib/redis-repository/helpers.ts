/**
 * @fileoverview Serialization helpers for Redis hash storage.
 *
 * Redis hashes store flat key-value string pairs.
 * These helpers handle conversion between DeviceMessage objects and Redis format.
 */

import { fromPairs, splitEvery } from 'ramda';
import { CreateDeviceMessageDto } from '../../dto/create-device-message.dto';
import {
  DeviceMessage,
  DeviceMessageDeliveryStatus,
  DeviceMessageDevice,
  DeviceMessageType,
} from '../types';
import { PhaseEnum } from '@core/types/device-messaging';

/**
 * Convert a flat array [key1, val1, key2, val2, ...] to an object.
 * Used to parse HGETALL results from Lua scripts.
 */
export const rawHashToObject = (raw: string[]): Record<string, string> => {
  const pairs = splitEvery(2, raw) as Array<[string, string]>;
  return fromPairs(pairs);
};

/**
 * Serialize a CreateDeviceMessageDto for Redis hash storage.
 * Complex objects (device, request_data) are JSON-stringified.
 */
export const serializeDeviceMessageDto = (dto: CreateDeviceMessageDto) => ({
  message_type: dto.message_type,
  priority: dto.priority,
  grid_id: dto.grid_id,
  device: JSON.stringify(dto.device),

  ...(dto.meter_interaction_id && { meter_interaction_id: dto.meter_interaction_id }),
  ...(dto.request_data && { request_data: JSON.stringify(dto.request_data) }),
  ...(dto.phase && { phase: dto.phase }),

  // Initial status when first enqueued
  delivery_status: 'QUEUED',
});

/**
 * Deserialize a Redis hash into a DeviceMessage object.
 * Parses JSON fields and converts string numbers back to integers.
 *
 * @param id - Message ULID
 * @param raw - Raw hash fields from Redis
 * @returns Fully typed DeviceMessage
 */
export const deserializeMessage = (id: string, raw: Record<string, string>): DeviceMessage => {
  const _parsed = {
    id,
    // Required strings
    message_type: raw.message_type as DeviceMessageType,
    delivery_status: raw.delivery_status as DeviceMessageDeliveryStatus,

    // Required numbers
    priority: parseInt(raw.priority),
    grid_id: parseInt(raw.grid_id),

    // Required JSON
    device: raw.device ? JSON.parse(raw.device) as DeviceMessageDevice : null,

    // Optional number
    ...('meter_interaction_id' in raw && { meter_interaction_id: parseInt(raw.meter_interaction_id) }),

    // Optional strings
    ...('delivery_queue_id' in raw && { delivery_queue_id: raw.delivery_queue_id }),

    // Optional JSON
    ...('request_data' in raw && { request_data: JSON.parse(raw.request_data) }),

    // Optional phase
    ...('phase' in raw && { phase: raw.phase as PhaseEnum }),

    // Delivery data
    retry_count: parseInt(raw.retry_count ?? '0'),
    failure_history: raw.failure_history ? JSON.parse(raw.failure_history) : [],
  };

  if(!_parsed.device) {
    console.info(`
      ==========================
      Message without a device!!
      ==========================
    `);
    console.info(_parsed);
  }

  return _parsed;
};
