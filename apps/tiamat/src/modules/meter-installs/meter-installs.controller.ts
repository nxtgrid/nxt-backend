import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthenticationGuard } from '../auth/authentication.guard';
import { MeterInstallsService } from './meter-installs.service';
import { MeterUninstallsService } from './meter-uninstalls.service';

@UseGuards(AuthenticationGuard)
@Controller('meter-installs')
export class MeterInstallsController {
  constructor(
    private readonly installsService: MeterInstallsService,
    private readonly uninstallsService: MeterUninstallsService,
  ) { }

  @Post('registration-result')
  registrationResult(
    @Body() { external_reference, result }: { external_reference: string; result: 'SUCCESSFUL' | 'FAILED'; },
  ) {
    return this.installsService.resumeDeferredInstall(external_reference, result);
  }

  @Post('deregistration-result')
  deregistrationResult(
    @Body() { external_reference, result }: { external_reference: string; result: 'SUCCESSFUL' | 'FAILED'; },
  ) {
    return this.uninstallsService.resumeDeferredUninstall(external_reference, result);
  }

  @Post('retry-commissioning')
  retryCommissioning(
    @Body() body: { id: number },
  ) {
    return this.installsService.retryCommissioning(body.id);
  }
}
