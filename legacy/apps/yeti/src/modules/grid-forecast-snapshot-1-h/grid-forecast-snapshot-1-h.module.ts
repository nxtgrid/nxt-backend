import { Module } from '@nestjs/common';
import { GridForecastSnapshot1HService } from './grid-forecast-snapshot-1-h.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GridForecastSnapshot1H } from '@timeseries/entities/grid-forecast-snapshot-1-h.entity';
import { Grid } from '@core/modules/grids/entities/grid.entity';

@Module({
  imports: [ TypeOrmModule.forFeature([ GridForecastSnapshot1H, Grid ]) ],
  providers: [ GridForecastSnapshot1HService ],
})
export class GridForecastSnapshot1HModule {}
