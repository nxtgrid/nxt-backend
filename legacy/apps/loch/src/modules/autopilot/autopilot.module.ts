import { Global, Module } from '@nestjs/common';
import { AutopilotController } from './autopilot.controller';
import { AutopilotService } from './autopilot.service';

@Global()
  @Module({
    providers: [ AutopilotService ],
    exports: [ AutopilotService ],
    controllers: [ AutopilotController ],
  })
export class AutopilotModule {}
