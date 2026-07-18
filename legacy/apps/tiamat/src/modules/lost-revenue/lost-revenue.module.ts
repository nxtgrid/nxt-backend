import { Global, Module } from '@nestjs/common';
import { LostRevenueController } from './lost-revenue.controller';
import { LostRevenueService } from './lost-revenue.service';

@Global()
  @Module({
    controllers: [ LostRevenueController ],
    providers: [ LostRevenueService ],
    exports: [ LostRevenueService ],
  })
export class LostRevenueModule {}
