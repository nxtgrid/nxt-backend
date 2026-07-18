import { Global, Module } from '@nestjs/common';
import { GridsService } from './grids.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GridsController } from './grids.controller';
import { Grid } from '@core/modules/grids/entities/grid.entity';

/**
 * 002d Task 11: Nest `GET /grids/:id` removed from controller (not ported).
 * Service retained for in-legacy callers + Metering re-home (connectivity / cabin-credit).
 */
@Global()
@Module({
  imports: [ TypeOrmModule.forFeature([ Grid ]) ],
  providers: [ GridsService ],
  exports: [ GridsService ],
  controllers: [ GridsController ],
})
export class GridsModule { }
