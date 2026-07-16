import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Bearer JWT via `supabase` strategy. `headerapikey` is added when ApiKeyStrategy lands.
 */
@Injectable()
export class AuthenticationGuard extends AuthGuard('supabase') {}
