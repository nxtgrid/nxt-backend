import { Global, Module } from '@nestjs/common';
import { DcusService } from './dcus.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Dcu } from './entities/dcu.entity';

@Global()
@Module({
  imports: [ TypeOrmModule.forFeature([ Dcu ]) ],
  providers: [ DcusService ],
  exports: [ DcusService ],
})
export class CoreDcusModule { }
