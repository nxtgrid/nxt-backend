import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetersController } from './meters.controller';
import { MetersService } from './meters.service';
import { Meter } from '@core/modules/meters/entities/meter.entity';

@Global()
@Module({
  imports: [ TypeOrmModule.forFeature([ Meter ]) ],
  controllers: [ MetersController ],
  providers: [ MetersService ],
  exports: [ MetersService ],
})
export class MetersModule { }
