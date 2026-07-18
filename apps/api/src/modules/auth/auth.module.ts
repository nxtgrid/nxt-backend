import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { ApiKeyStrategy } from './api-key.strategy.js';
import { AuthController } from './auth.controller.js';
import { AuthenticationGuard } from './authentication.guard.js';
import { SupabaseStrategy } from './supabase.strategy.js';

/** Host auth — Passport strategies + guard (admin client used for API-key lookup). */
@Module({
  imports: [ PassportModule ],
  controllers: [ AuthController ],
  providers: [ AuthenticationGuard, SupabaseStrategy, ApiKeyStrategy ],
  exports: [ AuthenticationGuard, PassportModule ],
})
export class AuthModule {}
