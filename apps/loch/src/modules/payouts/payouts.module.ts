import { Module } from '@nestjs/common';
import { PayoutsService } from './payouts.service';

@Module({
  providers: [ PayoutsService ],
})
export class PayoutsModule {}
