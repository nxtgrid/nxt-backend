import { Module } from '@nestjs/common';
import { MpptForecastSnapshot30MinService } from './mppt-forecast-snapshot-30-min.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MpptForecastSnapshot30Min } from '@timeseries/entities/mppt-forecast-30-min.entity';
import { Mppt } from '@core/modules/mppts/entities/mppt.entity';

@Module({
  imports: [ TypeOrmModule.forFeature([ MpptForecastSnapshot30Min, Mppt ]) ],
  providers: [ MpptForecastSnapshot30MinService ],
})
export class MpptForecastSnapshot30MinModule {}
