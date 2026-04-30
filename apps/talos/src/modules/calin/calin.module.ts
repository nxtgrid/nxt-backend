import { Global, Module } from '@nestjs/common';
import { CalinService } from './calin.service';
import { CalinV1Service } from './implementations/calinv1.service';
import { Calinv2Service } from './implementations/calinv2.service';

@Global()
@Module({
  providers: [
    CalinService,
    CalinV1Service,
    Calinv2Service,
  ],
  exports: [ CalinService ],
})
export class CalinModule { }
