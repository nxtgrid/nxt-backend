import { Module } from '@nestjs/common';
import { OrganizationSnapshot1DService } from './organization-snapshot-1-d.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationSnapshot1D } from '@timeseries/entities/organization-snapshot-1-d.entity';
import { Grid } from '@core/modules/grids/entities/grid.entity';

@Module({
  imports: [ TypeOrmModule.forFeature([ OrganizationSnapshot1D, Grid ]) ],
  providers: [ OrganizationSnapshot1DService ],
})
export class OrganizationSnapshot1DModule { }
