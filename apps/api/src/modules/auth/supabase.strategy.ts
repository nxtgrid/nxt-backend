import {
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { createClient, type PostgrestError } from '@supabase/supabase-js';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { Strategy } from 'passport-http-bearer';
import { requireEnv } from '@nxt/core/config';
import { throwSupabaseError } from '@nxt/core';
import type {
  AccountTypeEnum,
  MemberTypeEnum,
} from '@nxt/core/types/supabase-types';
import type { Database } from '@nxt/core/types/supabase-types-adjusted';

import type { AuthenticatedUser } from './authenticated-user.js';

interface AppMetadataClaims {
  account_type?: AccountTypeEnum;
  member_type?: MemberTypeEnum;
  account_id?: number | string;
  organization_id?: number | string;
}

interface UserMetadataClaims {
  full_name?: string;
}

@Injectable()
export class SupabaseStrategy extends PassportStrategy(Strategy, 'supabase') {
  private readonly logger = new Logger(SupabaseStrategy.name);
  private readonly supabaseUrl: string;
  private readonly publishableKey: string;
  private readonly jwks: ReturnType<typeof createRemoteJWKSet> | null;
  private readonly jwtSecret: Uint8Array | null;

  constructor() {
    super();
    this.supabaseUrl = requireEnv('SUPABASE_URL');
    this.publishableKey = requireEnv('SUPABASE_PUBLISHABLE_KEY');

    // @TODO :: This supports the legacy JWT SECRET :: Remove when all clients upgraded
    const jwksUrl = process.env.SUPABASE_JWKS_URL;
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    if (jwksUrl) {
      this.jwks = createRemoteJWKSet(new URL(jwksUrl));
      this.jwtSecret = null;
    }
    else if (jwtSecret) {
      this.jwks = null;
      this.jwtSecret = new TextEncoder().encode(jwtSecret);
    }
    else {
      throw new Error('MISSING SUPABASE_JWKS_URL or SUPABASE_JWT_SECRET');
    }
  }

  async validate(token: string): Promise<AuthenticatedUser> {
    let payload: JWTPayload;
    try {
      if (this.jwks) {
        payload = (await jwtVerify(token, this.jwks)).payload;
      }
      else if (this.jwtSecret) {
        payload = (await jwtVerify(token, this.jwtSecret, { algorithms: [ 'HS256' ] })).payload;
      }
      else {
        throw new Error('JWT verification is not configured');
      }
    }
    catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      // Expected for bad/expired client tokens — keep the log quiet (no stack dump).
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Rejecting bearer token: ${ reason }`);
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (!payload.sub) {
      throw new UnauthorizedException('No UID in token');
    }

    const email = typeof payload.email === 'string' ? payload.email : '';
    const userMetadata = (payload.user_metadata ?? {}) as UserMetadataClaims;
    const appMetadata = (payload.app_metadata ?? {}) as AppMetadataClaims;

    const account_id = Number(appMetadata.account_id);
    if (!Number.isFinite(account_id) || account_id <= 0) {
      throw new UnauthorizedException('This auth.user does not have a corresponding account');
    }

    const organization_id = Number(appMetadata.organization_id);
    if (!Number.isFinite(organization_id)) {
      throw new UnauthorizedException('Token is missing organization_id');
    }

    if (!appMetadata.account_type || !appMetadata.member_type) {
      throw new UnauthorizedException('Token is missing account_type or member_type');
    }

    const supabaseClient = createClient<Database>(
      this.supabaseUrl,
      this.publishableKey,
      { global: { headers: { Authorization: `Bearer ${ token }` } } },
    );

    const logger = this.logger;
    return {
      email,
      full_name: userMetadata.full_name ?? '',
      account_type: appMetadata.account_type,
      member_type: appMetadata.member_type,
      account_id,
      organization_id,
      supabase_id: payload.sub,
      supabase: {
        client: supabaseClient,
        handleResponse<T>({
          data,
          error,
          status,
        }: {
          data: T;
          error: PostgrestError | null;
          status: number;
        }): T {
          if (error) {
            throwSupabaseError(error, status, logger);
          }
          return data;
        },
      },
      validate({ organization_id: _organizationId }: { organization_id?: number } = {}) {
        return supabaseClient.auth
          .getUser()
          .then(({ data, error }) => {
            if (error) {
              throwSupabaseError(error, 401, logger);
            }
            if (!data?.user) {
              throw new UnauthorizedException('No valid user data found');
            }
            return data.user;
          });
      },
    };
  }
}
