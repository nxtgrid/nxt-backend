import { Module } from '@nestjs/common';
import { GridEnergySnapshot15MinService } from './grid-energy-snapshot-15-min.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GridEnergySnapshot15Min } from '@timeseries/entities/grid-energy-snapshot-15-min.entity';
import { Grid } from '@core/modules/grids/entities/grid.entity';

@Module({
  imports: [ TypeOrmModule.forFeature([ GridEnergySnapshot15Min, Grid ]) ],
  providers: [ GridEnergySnapshot15MinService ],
})
export class GridEnergySnapshot15MinModule { }
