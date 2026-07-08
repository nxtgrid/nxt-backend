import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DeviceDataSink } from '@timeseries/entities/device-data-sink.entity';

@Injectable()
export class DeviceDataSinkService {

  constructor(
    @InjectDataSource('timescale')
    protected readonly timescale: DataSource,
  ) { }

  insertIntoTimescale(chunk) {
    return this.timescale.createQueryBuilder()
      .insert()
      .into(DeviceDataSink)
      .values(chunk)
      .execute();
  }
}
