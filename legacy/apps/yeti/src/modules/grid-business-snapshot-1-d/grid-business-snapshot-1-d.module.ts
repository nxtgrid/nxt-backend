import { Module } from '@nestjs/common';
import { GridBusinessSnapshot1DService } from './grid-business-snapshot-1-d.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GridBusinessSnapshot1D } from '@timeseries/entities/grid-business-snapshot-1-d.entity';
import { Grid } from '@core/modules/grids/entities/grid.entity';

@Module({
  imports: [ TypeOrmModule.forFeature([ GridBusinessSnapshot1D, Grid ]) ],
  providers: [ GridBusinessSnapshot1DService ],
})
export class GridBusinessSnapshot1DModule { }
