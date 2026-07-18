import { Module } from '@nestjs/common';
import { MeterConsumptionService } from './meter-consumption.service';
import { MeterConsumptionController } from './meter-consumption.controller';

@Module({
  providers: [ MeterConsumptionService ],
  controllers: [ MeterConsumptionController ],
})
export class MeterConsumptionModule { }
