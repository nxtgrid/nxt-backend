import { Module } from '@nestjs/common';
import { MeterSnapshot1HService } from './meter-snapshot-1-h.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeterSnapshot1H } from '@timeseries/entities/meter-snapshot-1-h.entity';
import { Meter } from '@core/modules/meters/entities/meter.entity';
import { MeterSnapshot1HController } from './meter-snapshot-1-h.controller';

@Module({
  imports: [ TypeOrmModule.forFeature([ MeterSnapshot1H, Meter ]) ],
  providers: [ MeterSnapshot1HService ],
  controllers: [ MeterSnapshot1HController ],
})
export class MeterSnapshot1HModule { }
