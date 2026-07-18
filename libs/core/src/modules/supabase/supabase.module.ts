import {
  Global,
  Injectable,
  InternalServerErrorException,
  Logger,
  Module,
} from '@nestjs/common';
import { createClient, type PostgrestError, type SupabaseClient } from '@supabase/supabase-js';

import { requireEnv } from '#config/require-env.js';
import type { Database } from '#types/supabase-types-adjusted.js';
import { throwSupabaseError } from './supabase.errors.js';

export { throwSupabaseError } from './supabase.errors.js';

interface SupabaseResponse<T> {
  data: T;
  error: PostgrestError | null;
  status: number;
}

@Injectable()
export class SupabaseService {
  readonly adminClient: SupabaseClient<Database>;
  private readonly logger = new Logger(SupabaseService.name);

  constructor() {
    this.adminClient = createClient<Database>(
      requireEnv('SUPABASE_URL'),
      requireEnv('SUPABASE_SECRET_KEY'),
      {
        auth: {
          // Server-side admin client: no end-user session to persist or refresh.
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );
  }

  /**
   * Permissive: for `.maybeSingle()`, multi-row selects, etc.
   * Errors (including Cloudflare HTML 5xx) throw — never soft-return null.
   */
  HANDLE_RESPONSE_UNTYPED = ({
    data,
    error,
    status,
  }: SupabaseResponse<unknown>): unknown => {
    if (error) {
      throwSupabaseError(error, status, this.logger);
    }
    return data;
  };

  /**
   * Permissive: for `.maybeSingle()`, multi-row selects, etc.
   * `data` may be null when zero rows. Errors throw (no Cloudflare soft-null).
   */
  handleResponse = <T>({ data, error, status }: SupabaseResponse<T>): T => {
    if (error) {
      throwSupabaseError(error, status, this.logger);
    }
    return data;
  };

  /**
   * Strict: use after `.single()` only — value or throw.
   * PostgREST usually sets `error` on 0 rows; null `data` without error is treated as invariant break (500).
   */
  handleSingle = <T>({
    data,
    error,
    status,
  }: SupabaseResponse<T>): NonNullable<T> => {
    if (error) {
      throwSupabaseError(error, status, this.logger);
    }
    if (data == null) {
      throw new InternalServerErrorException('Expected a single row, got none');
    }
    return data;
  };
}

@Global()
@Module({
  providers: [ SupabaseService ],
  exports: [ SupabaseService ],
})
export class GlobalSupabaseModule {}
