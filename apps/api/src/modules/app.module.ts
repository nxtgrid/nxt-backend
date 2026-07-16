import { Module } from '@nestjs/common';
import {
  GlobalHttpModule,
  GlobalLoggerModule,
  GlobalSupabaseModule,
} from '@nxt/core';
import { AuthModule } from './auth/auth.module.js';
import { HealthModule } from './health/health.module.js';

/** Cross-cutting infra — Logger, Supabase, HTTP. */
const infrastructure = [ GlobalLoggerModule, GlobalSupabaseModule, GlobalHttpModule ];

/** Always-on Foundation domain for this host. */
const foundation = [ AuthModule, HealthModule ];

// Tier-1 capability conditionals (empty until capabilities are imported).

@Module({
  imports: [ ...infrastructure, ...foundation ],
})
export class AppModule {}
