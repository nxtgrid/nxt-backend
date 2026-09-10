import { Module } from '@nestjs/common';
import {
  GlobalHttpModule,
  GlobalLoggerModule,
  GlobalSupabaseModule,
} from '@nxt/core';
import { getConfig } from '@nxt/core/config';
import { AuthModule } from './auth/auth.module.js';
import { HealthModule } from './health/health.module.js';
import { MeterInteractionsModule } from './metering/meter-interactions/meter-interactions.module.js';
import { UserAdminModule } from './user-admin/user-admin.module.js';

/** Cross-cutting infra — Logger, Supabase, HTTP. */
const infrastructure = [ GlobalLoggerModule, GlobalSupabaseModule, GlobalHttpModule ];

/** Always-on Foundation domain for this host. */
const foundation = [ AuthModule, HealthModule, UserAdminModule ];

const cfg = getConfig();

@Module({
  imports: [
    ...infrastructure,
    ...foundation,
    ...(cfg.capabilities.metering?.enabled ? [ MeterInteractionsModule ] : []),
  ],
})
export class AppModule {}
