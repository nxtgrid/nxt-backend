import { Body, Controller, Post } from '@nestjs/common';
import { DeviceDataSinkService } from './device-data-sink.service';
import { DeviceDataSink } from '@timeseries/entities/device-data-sink.entity';

@Controller('device-data-sink')
export class DeviceDataSinkController {
  constructor(private readonly deviceDataSinkService: DeviceDataSinkService) { }

  @Post('ingest')
  create(@Body() body: DeviceDataSink) { //TODO: do we want to create a specific dto for it?
    return this.deviceDataSinkService.insertIntoTimescale(body);
  }
}
