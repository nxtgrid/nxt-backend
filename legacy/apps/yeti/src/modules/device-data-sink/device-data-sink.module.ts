import { Module } from '@nestjs/common';
import { DeviceDataSinkService } from './device-data-sink.service';
import { DeviceDataSinkController } from './device-data-sink.controller';

@Module({
  providers: [ DeviceDataSinkService ],
  controllers: [ DeviceDataSinkController ],
})
export class DeviceDataSinkModule {}
