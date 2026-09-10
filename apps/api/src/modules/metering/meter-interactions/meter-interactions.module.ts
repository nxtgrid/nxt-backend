import { Module } from '@nestjs/common';

import { DeviceMessagingClientModule } from '../../device-messaging-client/device-messaging-client.module.js';
import { MeterInteractionsService } from './meter-interactions.service.js';

/** Lean Metering shell — command interactions. No product HTTP in this slice. */
@Module({
  imports: [ DeviceMessagingClientModule ],
  providers: [ MeterInteractionsService ],
  exports: [ MeterInteractionsService ],
})
export class MeterInteractionsModule {}
