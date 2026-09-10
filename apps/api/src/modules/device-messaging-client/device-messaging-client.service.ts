import { Injectable } from '@nestjs/common';
import { requireEnv } from '@nxt/core/config';

/**
 * Inward event shape lands with the ACL (T4). Until then handlers accept unknown.
 */
export type DeviceMessagingEventHandler = (
  event: unknown,
) => void | Promise<void>;

/**
 * Glue to the nxt-device-messaging sidecar. HTTP and HMAC land in later tasks;
 * this class fail-fasts on the three env vars and owns in-process handler fan-out.
 */
@Injectable()
export class DeviceMessagingClientService {
  private handlers: DeviceMessagingEventHandler[] = [];

  constructor() {
    requireEnv('DEVICE_MESSAGING_BASE_URL');
    requireEnv('DEVICE_MESSAGING_API_KEY');
    requireEnv('DEVICE_MESSAGING_WEBHOOK_SECRET');
  }

  /**
   * Register a callback for inbound sidecar events. Dispatch is T6.
   *
   * @param handler - Consumer callback; must be idempotent
   */
  registerHandler(handler: DeviceMessagingEventHandler): void {
    this.handlers = [ ...this.handlers, handler ];
  }

  /**
   * Enqueue one command. Stub until outbound HTTP (T5).
   */
  enqueue(): Promise<never> {
    throw new Error('DeviceMessagingClientService.enqueue is not implemented');
  }

  /**
   * Look up a message by opaque `correlation_id`. Stub until outbound HTTP (T5).
   */
  get(_correlationId: string): Promise<never> {
    throw new Error('DeviceMessagingClientService.get is not implemented');
  }

  /**
   * Mint a token synchronously. Stub until outbound HTTP (T5).
   */
  generateToken(): Promise<never> {
    throw new Error('DeviceMessagingClientService.generateToken is not implemented');
  }
}
