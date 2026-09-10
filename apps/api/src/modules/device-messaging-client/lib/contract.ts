/**
 * Wire types from `@nxtgrid/device-messaging-contract`.
 *
 * Mapping to inward snake_case is T4. Do not import this from
 * meter-interactions — Zod and camelCase stay in the glue (D5).
 */
export type {
  CommandType,
  CreateDeviceMessage,
  DeviceMessageDeliveryStatus,
  DeviceMessageResponse,
  EnqueueableCommandType,
  GenerateTokenRequest,
  GenerateTokenResponse,
  WebhookEvent,
  WebhookMessage,
} from '@nxtgrid/device-messaging-contract';
