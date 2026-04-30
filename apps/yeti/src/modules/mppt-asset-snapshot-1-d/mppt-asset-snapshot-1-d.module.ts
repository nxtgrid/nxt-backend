import { Global, Module } from '@nestjs/common';
import { MpptAssetSnapshot1DService } from './mppt-asset-snapshot-1-d.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Grid } from '@core/modules/grids/entities/grid.entity';
import { MpptAssetSnapshot1D } from '@timeseries/entities/mppt-asset-snapshot-1-d.entity';

@Global()
@Module({
  imports: [ TypeOrmModule.forFeature([ MpptAssetSnapshot1D, Grid ]) ],
  providers: [ MpptAssetSnapshot1DService ],
  exports: [ MpptAssetSnapshot1DService ],
})
export class MpptAssetSnapshot1DModule {}
