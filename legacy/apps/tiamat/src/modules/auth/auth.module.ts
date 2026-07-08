import { Global, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AccountsModule } from '../accounts/accounts.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ApiKeyStrategy } from './api-key.strategy';
import { AuthController } from './auth.controller';
import { SupabaseStrategy } from './supabase.strategy';

@Global()
@Module({
  imports: [
    AccountsModule,
    PassportModule,
    JwtModule.register({
      privateKey: process.env.PRIVATE_KEY,
      signOptions: {
        expiresIn: process.env.NXT_JWT_DURATION,
        algorithm: 'RS256',
      },
    }) ],
  providers: [
    AuthService,
    ApiKeyStrategy,
    SupabaseStrategy,
  ],
  controllers: [ AuthController ],
  exports: [ AuthService ],
})
export class AuthModule { }

