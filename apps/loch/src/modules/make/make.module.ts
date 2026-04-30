import { Global, Module } from '@nestjs/common';
import { MakeService } from '@core/modules/make/make.service';

@Global()
@Module({
  providers: [ MakeService ],
  exports: [ MakeService ],
})
export class MakeModule {}
