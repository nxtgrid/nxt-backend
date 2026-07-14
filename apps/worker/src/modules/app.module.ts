import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { HeartbeatModule } from './heartbeat/heartbeat.module';

@Module({
  imports: [ ScheduleModule.forRoot(), HeartbeatModule ],
  controllers: [],
})
export class AppModule {}
