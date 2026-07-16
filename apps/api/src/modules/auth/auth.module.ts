import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { AuthController } from './auth.controller.js';
import { AuthenticationGuard } from './authentication.guard.js';
import { SupabaseStrategy } from './supabase.strategy.js';

/**
 * Host auth — Passport strategies + guard.
 * `GlobalSupabaseModule` provides the admin client for API-key lookup (next).
 */
@Module({
  imports: [ PassportModule ],
  controllers: [ AuthController ],
  providers: [ AuthenticationGuard, SupabaseStrategy ],
  exports: [ AuthenticationGuard, PassportModule ],
})
export class AuthModule {}
