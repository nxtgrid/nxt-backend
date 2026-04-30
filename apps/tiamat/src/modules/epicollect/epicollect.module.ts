import { Module } from '@nestjs/common';
import { EpicollectController } from './epicollect.controller';
import { EpicollectService } from './epicollect.service';

@Module({
  controllers: [ EpicollectController ],
  providers: [ EpicollectService ],
})
export class EpicollectModule {}
