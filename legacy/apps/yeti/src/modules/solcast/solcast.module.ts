import { Global, Module } from '@nestjs/common';
import { SolcastService } from './solcast.service';

@Global()
@Module({
  providers: [ SolcastService ],
  exports: [ SolcastService ],
})
export class SolcastModule { }
