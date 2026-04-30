import { Global, Module } from '@nestjs/common';
import { MpptsService } from '@core/modules/mppts/mppts.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Mppt } from '@core/modules/mppts/entities/mppt.entity';

@Global()
@Module({
  imports: [ TypeOrmModule.forFeature([ Mppt ]) ],
  providers: [ MpptsService ],
  exports: [ MpptsService ],
})
export class MpptsModule { }
