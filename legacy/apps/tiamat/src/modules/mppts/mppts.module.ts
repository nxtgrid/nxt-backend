import { Global, Module } from '@nestjs/common';
import { MpptsService } from '@core/modules/mppts/mppts.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Mppt } from '@core/modules/mppts/entities/mppt.entity';
import { MpptsController } from './mppts.controller';

@Global()
@Module({
  imports: [ TypeOrmModule.forFeature([ Mppt ]) ],
  providers: [ MpptsService ],
  exports: [ MpptsService ],
  controllers: [ MpptsController ],
})
export class MpptsModule { }
