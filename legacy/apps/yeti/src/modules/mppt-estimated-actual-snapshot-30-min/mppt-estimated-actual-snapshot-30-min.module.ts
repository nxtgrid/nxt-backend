import { Module } from '@nestjs/common';
import { MpptEstimatedActualSnapshot30MinService } from './mppt-estimated-actual-snapshot-30-min.service';
import { MpptEstimatedActualSnapshot30Min } from '@timeseries/entities/mppt-estimated-actual-snapshot-30-min.entity';
import { Mppt } from '@core/modules/mppts/entities/mppt.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [ TypeOrmModule.forFeature([ MpptEstimatedActualSnapshot30Min, Mppt ]) ],
  providers: [ MpptEstimatedActualSnapshot30MinService ],
})
export class MpptEstimatedActualSnapshot30MinModule { }
