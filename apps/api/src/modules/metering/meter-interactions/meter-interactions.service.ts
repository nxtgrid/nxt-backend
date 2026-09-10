import { Injectable, type OnModuleInit } from '@nestjs/common';

import { DeviceMessagingClientService } from '../../device-messaging-client/device-messaging-client.service.js';

/**
 * Metering command/interaction shell. Product HTTP is out of this slice;
 * delivery handling is a no-op until meter-state (ADR-002*).
 */
@Injectable()
export class MeterInteractionsService implements OnModuleInit {
  constructor(
    private readonly deviceMessagingClient: DeviceMessagingClientService,
  ) {}

  onModuleInit(): void {
    this.deviceMessagingClient.registerHandler(
      this.onDeliveryEvent.bind(this),
    );
  }

  /**
   * Sidecar delivery callback. No-op until meter-state consumes the event.
   */
  private onDeliveryEvent(_event: unknown): void {
    return;
  }
}
