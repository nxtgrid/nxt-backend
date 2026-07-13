import { Module } from '@nestjs/common';

import { ScheduleModule } from '@nestjs/schedule';

import { HeartbeatService } from './heartbeat.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [],
  providers: [ HeartbeatService ],
})
export class AppModule {}
