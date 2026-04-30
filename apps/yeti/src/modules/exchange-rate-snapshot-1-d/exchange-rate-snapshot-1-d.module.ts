import { Module } from '@nestjs/common';
import { ExchangeRateSnapshot1DService } from './exchange-rate-snapshot-1-d.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExchangeRateSnapshot1D } from '@timeseries/entities/exchange-rate-snapshot-1-d.entity';
import { Grid } from '@core/modules/grids/entities/grid.entity';

@Module({
  imports: [ TypeOrmModule.forFeature([ ExchangeRateSnapshot1D, Grid ]) ],
  providers: [ ExchangeRateSnapshot1DService ],
})
export class ExchangeRateSnapshot1DModule { }
