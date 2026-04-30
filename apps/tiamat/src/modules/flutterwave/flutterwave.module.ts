import { Global, Module } from '@nestjs/common';
import { FlutterwaveController } from './flutterwave.controller';
import { FlutterwaveService } from './flutterwave.service';

@Global()
@Module({
  controllers: [ FlutterwaveController ],
  providers: [ FlutterwaveService ],
  exports: [ FlutterwaveService ],
})
export class FlutterwaveModule { }
