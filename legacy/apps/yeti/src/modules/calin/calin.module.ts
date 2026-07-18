import { Global, Module } from '@nestjs/common';
import { CalinV1Service } from './implementations/calinv1.service';
import { CalinService } from './calin.service';
import { Calinv2Service } from './implementations/calinv2.service';
import { CalinLorawanService } from './implementations/calin-lorawan.service';

@Global()
@Module({
  providers: [
    CalinV1Service,
    CalinService,
    Calinv2Service,
    CalinLorawanService,
  ],
  exports: [ CalinService ],
})
export class CalinModule { }
