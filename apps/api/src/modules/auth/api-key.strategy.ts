import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { HeaderAPIKeyStrategy } from 'passport-headerapikey';
import { SupabaseService } from '@nxt/core';

import type { AuthenticatedUser } from './authenticated-user.js';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(HeaderAPIKeyStrategy) {
  constructor(private readonly supabase: SupabaseService) {
    super({ header: 'X-API-KEY', prefix: '' }, false);
  }

  async validate(apiKey: string): Promise<AuthenticatedUser> {
    const row = await this.supabase.adminClient
      .from('api_keys')
      .select(`
        id,
        account:accounts (
          id,
          email,
          full_name,
          deleted_at,
          supabase_id,
          member:members (
            member_type
          ),
          organization:organizations (
            id
          )
        )
      `)
      .eq('key', apiKey)
      .maybeSingle()
      .then(this.supabase.handleResponse)
    ;

    const account = row?.account;
    if (!account || account.deleted_at) {
      throw new UnauthorizedException(
        'The API key used does not have a corresponding account',
      );
    }

    const member = account.member;
    const organization = account.organization;
    if (!member?.member_type || organization?.id == null) {
      throw new UnauthorizedException(
        'The API key account is missing member or organization claims',
      );
    }

    return {
      email: account.email ?? '',
      full_name: account.full_name ?? '',
      account_type: 'MEMBER',
      member_type: member.member_type,
      account_id: account.id,
      organization_id: organization.id,
      supabase_id: account.supabase_id ?? '',
      async validate() { return {}; },
    };
  }
}
