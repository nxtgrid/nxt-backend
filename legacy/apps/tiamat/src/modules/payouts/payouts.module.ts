import { Global, Module } from '@nestjs/common';
import { PayoutsService } from './payouts.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payout } from '@core/modules/payouts/entities/payout.entity';
import { PayoutsController } from './payouts.controller';

@Global()
@Module({
  imports: [ TypeOrmModule.forFeature([ Payout ]) ],
  providers: [ PayoutsService ],
  exports: [ PayoutsService ],
  controllers: [ PayoutsController ],
})
export class PayoutsModule {}
