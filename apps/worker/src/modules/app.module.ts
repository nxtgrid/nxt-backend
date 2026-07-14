import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { demoModules, getConfig } from '@nxt/core';

import { HeartbeatModule } from './heartbeat/heartbeat.module';

const alwaysOn = [ ScheduleModule.forRoot(), HeartbeatModule ];

@Module({
  imports: [ ...alwaysOn, ...demoModules(getConfig()) ],
  controllers: [],
})
export class AppModule {}
