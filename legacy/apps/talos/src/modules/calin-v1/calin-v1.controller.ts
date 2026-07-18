import { Body, Controller, Delete, Param, Post } from '@nestjs/common';
import { CalinV1RegistrationService } from './calin-v1-registration.service';
import { CalinV1DeregistrationService } from './calin-v1-deregistration.service';
import { RegisterCalinV1MeterDto } from './dto/register-calin-v1-meter.dto';

@Controller('calin-v1')
export class CalinV1Controller {
  constructor(
    private readonly registrationService: CalinV1RegistrationService,
    private readonly deregistrationService: CalinV1DeregistrationService,
  ) {}

  @Post('register-meter')
  registerMeter(
    @Body() dto: RegisterCalinV1MeterDto,
  ) {
    this.registrationService.registerMeter(dto);
    return { received: true };
  }

  @Delete('deregister-meter/:external_reference')
  deregisterMeter(
    @Param('external_reference') external_reference: string,
  ) {
    this.deregistrationService.deregisterMeter(external_reference);
    return { received: true };
  }
}
