import { Global, Module } from '@nestjs/common';
import { AfricastalkingService } from './africastalking.service';

@Global()
@Module({
  providers: [ AfricastalkingService ],
  exports: [ AfricastalkingService ],
})
export class AfricastalkingModule {}
