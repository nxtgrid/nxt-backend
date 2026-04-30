import { Global, Module } from '@nestjs/common';
import { SoftwareDevAlertService } from './software-dev-alert.service';

@Global()
@Module({
  providers: [ SoftwareDevAlertService ],
  exports: [ SoftwareDevAlertService ],
})
export class SoftwareDevAlertModule {}
