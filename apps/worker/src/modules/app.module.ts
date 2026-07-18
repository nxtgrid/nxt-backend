import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import {
  GlobalHttpModule,
  GlobalLoggerModule,
  GlobalSupabaseModule,
} from '@nxt/core';

import { HeartbeatModule } from './heartbeat/heartbeat.module';

/** Cross-cutting infra — Logger, Supabase, HTTP (3rd-party integrations). */
const infrastructure = [ GlobalLoggerModule, GlobalSupabaseModule, GlobalHttpModule ];

/** Always-on Foundation for this host (scheduler + heartbeat). */
const foundation = [ ScheduleModule.forRoot(), HeartbeatModule ];

// Tier-1 capability conditionals (empty until capabilities are imported).

@Module({
  imports: [ ...infrastructure, ...foundation ],
  controllers: [],
})
export class AppModule {}
