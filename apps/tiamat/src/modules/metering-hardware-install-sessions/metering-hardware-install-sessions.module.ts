import { Global, Module } from '@nestjs/common';
import { MeteringHardwareInstallSessionsService } from './metering-hardware-install-sessions.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeteringHardwareInstallSession } from '@core/modules/metering-hardware-install-sessions/entities/metering-hardware-install-session.entity';

@Global()
@Module({
  imports: [ TypeOrmModule.forFeature([ MeteringHardwareInstallSession ]) ],
  providers: [ MeteringHardwareInstallSessionsService ],
  exports: [ MeteringHardwareInstallSessionsService ],
})
export class MeteringHardwareInstallSessionsModule {}
