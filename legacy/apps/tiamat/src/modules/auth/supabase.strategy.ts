import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-http-bearer';
import { verify, JwtPayload } from 'jsonwebtoken';
import { createClient, PostgrestError } from '@supabase/supabase-js';
import { NxtSupabaseUser } from './nxt-supabase-user';
import { throwSupabaseError } from '@core/modules/supabase.module';
import { AccountsService } from '@core/modules/accounts/accounts.service';
import { NXT_ORG_ID } from '@core/constants';

import type { Database } from '@core/types/supabase-types-adjusted';

const { SUPABASE_API_URL, SUPABASE_ANON_KEY, SUPABASE_JWT_SECRET } = process.env;

@Injectable()
export class SupabaseStrategy extends PassportStrategy(Strategy, 'supabase') {
  constructor(
    @Inject(AccountsService)
    private readonly accountsService: AccountsService,
  ) { super(); }

  async validate(token: string): Promise<NxtSupabaseUser> {
    let decoded: JwtPayload;
    try {
      decoded = verify(token, SUPABASE_JWT_SECRET) as JwtPayload;
    }
    catch(err) {
      console.error('Error verifying Supabase token', err);
      throw new UnauthorizedException('Invalid or expired token');
    }
    if(!decoded?.sub) throw new UnauthorizedException('No UID in token');

    const {
      email,
      sub,
      user_metadata: { full_name },
      app_metadata: { account_type, member_type, account_id, organization_id },
    } = decoded;
    if(!account_id) throw new UnauthorizedException('This auth.user does not have a corresponding account');

    const supabaseClient = createClient<Database>(
      SUPABASE_API_URL,
      SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${ token }` } } },
    );

    // @TEMPORARY :: Our old system is expecting an Account object,
    // so we tack on the Account for now until it is not needed anymore
    const account = await this.accountsService.findOne(account_id);
    if(!account) throw new UnauthorizedException('No account for this user');

    return {
      email,
      full_name,
      account_type,
      member_type,
      account_id,
      organization_id,
      is_nxt_grid_member: organization_id === NXT_ORG_ID,
      supabase_id: sub,
      supabase: {
        client: supabaseClient,
        handleResponse<T,>({ data, error, status }: { data: T, error: PostgrestError, status: number }): T {
          if (error) throwSupabaseError(error, status);
          return data;
        },
      },
      validate({ organization_id }: { organization_id?: number } = {}) {
        if(organization_id) {
          // @TODO :: Match against this.organization_id (let all NXT Grid pass)
          console.info('Validate against organization id', organization_id);
        }
        return this.supabase.client.auth
          .getUser()
          .then(({ data, error }) => {
            if(error) throwSupabaseError(error, 401);
            if (!data?.user) throw new UnauthorizedException('No valid user data found');
            return data.user;
          })
        ;
      },
      account,
    };
  }
}
