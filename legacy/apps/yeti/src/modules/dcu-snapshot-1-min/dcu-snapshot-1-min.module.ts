import { Module } from '@nestjs/common';
import { DcuSnapshot1MinService } from './dcu-snapshot-1-min.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Dcu } from '@core/modules/dcus/entities/dcu.entity';
import { DcuSnapshot1Min } from '@timeseries/entities/dcu-snapshot-1-min.entity';

@Module({
  imports: [ TypeOrmModule.forFeature([ DcuSnapshot1Min, Dcu ]) ],
  providers: [ DcuSnapshot1MinService ],
})
export class DcuSnapshot1MinModule { }
