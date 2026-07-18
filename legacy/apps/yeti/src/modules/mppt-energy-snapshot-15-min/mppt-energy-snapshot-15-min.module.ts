import { Module } from '@nestjs/common';
import { MpptEnergySnapshot15MinService } from './mppt-energy-snapshot-15-min.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MpptEnergySnapshot15Min } from '@timeseries/entities/mppt-energy-snapshot-15-min.entity';
import { Mppt } from '@core/modules/mppts/entities/mppt.entity';

@Module({
  imports: [ TypeOrmModule.forFeature([ MpptEnergySnapshot15Min, Mppt ]) ],
  providers: [ MpptEnergySnapshot15MinService ],
})
export class MpptEnergySnapshot15MinModule { }
