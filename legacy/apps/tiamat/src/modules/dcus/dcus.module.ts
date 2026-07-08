import { Global, Module } from '@nestjs/common';
import { DcusService } from './dcus.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DcusController } from './dcus.controller';
import { Dcu } from '@core/modules/dcus/entities/dcu.entity';

@Global()
@Module({
  imports: [ TypeOrmModule.forFeature([ Dcu ]) ],
  providers: [ DcusService ],
  exports: [ DcusService ],
  controllers: [ DcusController ],
})
export class DcusModule { }
