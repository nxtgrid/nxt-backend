import { Module } from '@nestjs/common';
import { EpicollectService } from './epicollect.service';
import { EpicollectController } from './epicollect.controller';

@Module({
  providers: [ EpicollectService ],
  controllers: [ EpicollectController ],
})
export class EpicollectModule { }
