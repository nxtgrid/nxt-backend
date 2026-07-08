import { Module } from '@nestjs/common';
import { AutopilotService } from './autopilot.service';
import { AutopilotController } from './autopilot.controller';

@Module({
  providers: [ AutopilotService ],
  controllers: [ AutopilotController ],
})
export class AutopilotModule {}
