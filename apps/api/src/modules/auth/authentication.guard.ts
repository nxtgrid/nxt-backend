import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Accepts either a Supabase bearer JWT (`supabase`) or an `X-API-KEY` header
 * (`headerapikey`).
 */
@Injectable()
export class AuthenticationGuard extends AuthGuard([ 'supabase', 'headerapikey' ]) {}
