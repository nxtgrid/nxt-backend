import { Module } from '@nestjs/common';
import { GridDiagnosticsService } from './grid-diagnostics.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Grid } from '@core/modules/grids/entities/grid.entity';

@Module({
  imports: [ TypeOrmModule.forFeature([ Grid ]) ],
  providers: [ GridDiagnosticsService ],
})
export class GridDiagnosticsModule {}
