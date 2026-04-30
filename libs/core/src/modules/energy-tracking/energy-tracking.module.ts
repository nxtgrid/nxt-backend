import { Global, Module } from '@nestjs/common';
import { EnergyTrackingService } from './energy-tracking.service';

@Global()
@Module({
  providers: [ EnergyTrackingService ],
  exports: [ EnergyTrackingService ],
})
export class CoreEnergyTrackingModule {}
