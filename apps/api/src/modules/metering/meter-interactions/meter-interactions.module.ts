import { Module } from '@nestjs/common';

import { MeterInteractionsService } from './meter-interactions.service.js';

/** Lean Metering shell — command interactions. No product HTTP in this slice. */
@Module({
  providers: [ MeterInteractionsService ],
  exports: [ MeterInteractionsService ],
})
export class MeterInteractionsModule {}
