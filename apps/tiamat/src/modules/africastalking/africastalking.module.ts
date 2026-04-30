import { Global, Module } from '@nestjs/common';
import { AfricastalkingController } from './africastalking.controller';

@Global()
@Module({
  controllers: [ AfricastalkingController ],
})
export class AfricastalkingModule { }
