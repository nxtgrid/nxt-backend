import { Global, Module } from '@nestjs/common';
import { VictronService } from './victron.service';

@Global()
@Module({
  providers: [ VictronService ],
  exports: [ VictronService ],
})
export class CoreVictronModule {}
