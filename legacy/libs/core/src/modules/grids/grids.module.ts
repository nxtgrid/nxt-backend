import { Global, Module } from '@nestjs/common';
import { GridsService } from './grids.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Grid } from './entities/grid.entity';

@Global()
@Module({
  imports: [ TypeOrmModule.forFeature([ Grid ]) ],
  providers: [ GridsService ],
  exports: [ GridsService ],
})
export class CoreGridsModule { }
