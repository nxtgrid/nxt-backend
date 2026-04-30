import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Meter } from './entities/meter.entity';
import { MetersService } from './meters.service';

@Global()
@Module({
  imports: [ TypeOrmModule.forFeature([ Meter ]) ],
  providers: [ MetersService ],
  exports: [ MetersService ],
})
export class CoreMetersModule { }
