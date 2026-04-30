import { Module } from '@nestjs/common';
import { RouterSnapshot1MinService } from './router-snapshot-1-min.service';
import { RoutersService } from './routers.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Router } from '@core/modules/routers/entities/router.entity';
import { Grid } from '@core/modules/grids/entities/grid.entity';

@Module({
  imports: [ TypeOrmModule.forFeature([ Router, Grid ]) ],
  providers: [ RouterSnapshot1MinService, RoutersService ],
})
export class RouterSnapshot1MinModule { }
