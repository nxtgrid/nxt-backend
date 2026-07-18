import { Global, Module } from '@nestjs/common';
import { CalinV1CoreService } from './calin-v1-core.service';
import { CalinV1RegistrationService } from './calin-v1-registration.service';
import { CalinV1DeregistrationService } from './calin-v1-deregistration.service';
import { CalinV1Controller } from './calin-v1.controller';

@Global()
@Module({
  providers: [
    CalinV1CoreService,
    CalinV1RegistrationService,
    CalinV1DeregistrationService,
  ],
  controllers: [ CalinV1Controller ],
  exports: [
    CalinV1CoreService,
    CalinV1RegistrationService,
    CalinV1DeregistrationService,
  ],
})
export class CalinV1Module {}
