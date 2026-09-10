import { Module } from '@nestjs/common';

import { DeviceMessagingClientService } from './device-messaging-client.service.js';

/**
 * Sidecar glue. Not Global — consumers import this module (D11).
 * Webhook controller lands in T6.
 */
@Module({
  providers: [ DeviceMessagingClientService ],
  exports: [ DeviceMessagingClientService ],
})
export class DeviceMessagingClientModule {}
