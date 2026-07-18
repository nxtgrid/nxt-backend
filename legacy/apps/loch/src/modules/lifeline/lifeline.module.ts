import { Module } from '@nestjs/common';
import { LifelineService } from './lifeline.service';

@Module({
  providers: [ LifelineService ],
})
export class LifelineModule {}
