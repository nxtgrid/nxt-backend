import { Global, Module } from '@nestjs/common';
import { ZerotierService } from './zerotier.service';

@Global()
  @Module({
    providers: [ ZerotierService ],
    exports: [ ZerotierService ],
  })
export class ZerotierModule {}
