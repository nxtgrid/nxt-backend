import { Global, Module } from '@nestjs/common';
import { SunriseSunsetService } from './sunrise-sunset.service';

@Global()
  @Module({
    providers: [ SunriseSunsetService ],
    exports: [ SunriseSunsetService ],
  })
export class SunriseSunsetModule {}
