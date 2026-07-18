/**
 * @fileoverview Type definitions for the device messaging system.
 *
 * This module handles communication with remote devices (meters) through
 * various network server implementations (currently LoRaWAN via ChirpStack).
 */

import { Json, MeterInteractionTypeEnum } from '@core/types/supabase-types';
import { CreateDeviceMessageDto } from '../dto/create-device-message.dto';

export type GatewayInfo = {
  id?: number;
  external_reference?: string;
  snr?: number;
  rssi?: number;
}

/** Supported network server implementations (manufacturer + protocol). */
export type NetworkServerImplementation = 'CALIN_LORAWAN' | 'CALIN_API_V1' | 'CALIN_API_V2';

/** Implementations that use the PULL (polling) pattern for delivery confirmation. */
export const PULL_PATTERN_IMPLEMENTATIONS: NetworkServerImplementation[] = [ 'CALIN_API_V1', 'CALIN_API_V2' ];

/** Types of devices we can communicate with. */
export type DeviceType = 'ELECTRICITY_METER';

export type DeviceManufacturerEnum = 'CALIN';
export type DeviceProtocolEnum = 'LORAWAN' | 'API_V1' | 'API_V2';

/** Outcome of command execution on the device. */
export type MessageResponseStatus = 'EXECUTION_SUCCESS' | 'EXECUTION_FAILURE';

/** Message types correspond to meter interaction types until we have other device types. */
export type DeviceMessageType = MeterInteractionTypeEnum;

export type SetDatePayload = {
  year: number;
  month: number;
  day: number;
}

export type SetTimePayload = {
  hour: number;
  minute: number;
  second?: number;
}

/**
 * Delivery status representing the message's position in the delivery pipeline.
 *
 * Flow: QUEUED → SENT_TO_NS → DELIVERED_TO_NS → SENT_TO_DEVICE → DELIVERY_SUCCESSFUL
 *       ↓ (on failure at any step)
 *       TO_RETRY → QUEUED (retry) or DELIVERY_FAILED (max retries exceeded)
 */
export type DeviceMessageDeliveryStatus =
  'QUEUED' |
  'TO_RETRY' |
  'SENT_TO_NS' |
  'DELIVERED_TO_NS' |
  'SENT_TO_DEVICE' |
  'DELIVERY_SUCCESSFUL' |
  'DELIVERY_FAILED'
;

/**
 * Information about the target device for message delivery.
 */
export type DeviceMessageDevice = {
  /** Device category. */
  type: DeviceType;
  /** Unique identifier (e.g., meter serial number). */
  external_reference: string;
  /** Device manufacturer (e.g., 'CALIN'). */
  manufacturer: DeviceManufacturerEnum;
  /** Communication protocol (e.g., 'LORAWAN'). */
  protocol: DeviceProtocolEnum;
  /** Gateway that relays messages to this device. */
  gateway?: GatewayInfo;
};

/**
 * Context provided when a delivery attempt fails.
 * Used as input to retryOrFail and by network server adapters.
 */
export type FailureContext = {
  /** Human-readable description of what went wrong. */
  reason: string;
  /** gRPC or HTTP error code from the network server. */
  errorCode?: number | string;
  /** Additional error context (e.g., gRPC details, constraint names). */
  details?: string;
  /** If true, skip retries and fail immediately (unrecoverable error). */
  skipRetry?: boolean;
};

/**
 * Record of a delivery attempt failure, stored in failure_history.
 */
export type FailureReason = {
  /** Human-readable description of what went wrong. */
  reason: string;
  /** gRPC or HTTP error code from the network server. */
  errorCode?: number | string;
  /** Additional error context (e.g., gRPC details, constraint names). */
  details?: string;
  /** Delivery status when the failure occurred. */
  status: DeviceMessageDeliveryStatus;
  /** ISO timestamp of the failure. */
  timestamp: string;
  /** Flags whether this is the final. */
  isFinal?: boolean;
}

/**
 * Result of a cancel operation for a single meter interaction.
 * Returned by cancelOneByMeterInteractionId and cancelManyByMeterInteractionIds.
 */
export type CancelMessageResult = {
  meter_interaction_id: number;
  /** CANCELLED: all messages removed. NOT_CANCELLABLE: at least one was in-flight. NOT_FOUND: no messages in Redis. */
  result: 'CANCELLED' | 'NOT_CANCELLABLE' | 'NOT_FOUND';
};

/**
 * A message to be delivered to a remote device.
 *
 * Lifecycle:
 * 1. Created via CreateDeviceMessageDto and enqueued
 * 2. Moves through delivery queues (NS → GW → Device)
 * 3. Receives response or times out
 * 4. On failure: retries with backoff or fails permanently
 */
export type DeviceMessage = CreateDeviceMessageDto & {
  /** Unique identifier (ULID). */
  id: string;
  /** External queue ID from network server (ChirpStack, Calin API, etc.). */
  delivery_queue_id: string;
  /** Current position in delivery pipeline. */
  delivery_status: DeviceMessageDeliveryStatus;
  /** Response data from the device (on success). */
  response?: {
    status: MessageResponseStatus;
    data?: Json;
  };
  /** True if device sent this message without being asked. */
  unsolicited?: boolean;
  /** Number of delivery attempts (0 = first attempt). */
  retry_count?: number;
  /** History of failed delivery attempts. */
  failure_history?: FailureReason[];
};

/**
 * Parsed event from network server webhook (almost a partial DeviceMessage).
 * Used by incoming adapters to normalize different webhook formats.
 */
export type ParsedIncomingEvent = {
  /** Type of meter interaction (optional for ACK events). */
  message_type?: MeterInteractionTypeEnum;
  /** External queue ID to correlate with stored message. */
  delivery_queue_id?: string;
  /** New delivery status based on event type. */
  delivery_status: DeviceMessageDeliveryStatus;
  /** Device information from the event. */
  device: DeviceMessageDevice;
  /** Response payload from device (for uplink events). */
  response?: {
    status: MessageResponseStatus;
    data?: Json;
  };
  /** True if this is an unsolicited uplink from the device. */
  unsolicited?: boolean;

  failure_context?: FailureContext;
};
