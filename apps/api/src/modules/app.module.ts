import { Module } from '@nestjs/common';
import {
  GlobalHttpModule,
  GlobalLoggerModule,
  GlobalSupabaseModule,
} from '@nxt/core';
import { HealthModule } from './health/health.module';

/** Cross-cutting infra — Logger, Supabase, HTTP. */
const infrastructure = [ GlobalLoggerModule, GlobalSupabaseModule, GlobalHttpModule ];

/** Always-on Foundation domain for this host. */
const foundation = [ HealthModule ];

// Tier-1 capability conditionals (empty until capabilities are imported).

@Module({
  imports: [ ...infrastructure, ...foundation ],
})
export class AppModule {}
