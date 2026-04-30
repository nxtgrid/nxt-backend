import { Global, Module } from '@nestjs/common';
import { MeterInstallsService } from './meter-installs.service';
import { MeterUninstallsService } from './meter-uninstalls.service';
import { MeterInstallsController } from './meter-installs.controller';

// Adapters
import { CalinLorawanInstallService } from './adapters/calin-lorawan/_install.service';
import { CalinApiV1InstallService } from './adapters/calin-api-v1/_install.service';
import { CalinApiV2InstallService } from './adapters/calin-api-v2/_install.service';

@Global()
@Module({
  providers: [
    MeterInstallsService,
    MeterUninstallsService,
    CalinLorawanInstallService,
    CalinApiV1InstallService,
    CalinApiV2InstallService,
  ],
  controllers: [ MeterInstallsController ],
  exports: [ MeterInstallsService, MeterUninstallsService ],
})
export class MeterInstallsModule {}
