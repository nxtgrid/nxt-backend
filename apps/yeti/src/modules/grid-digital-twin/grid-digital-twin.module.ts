import { Module } from '@nestjs/common';
import { GridDigitalTwinService } from './grid-digital-twin.service';

@Module({
  providers: [ GridDigitalTwinService ],
})
export class GridDigitalTwinModule {}
