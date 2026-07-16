import { Global, Injectable, Logger, Module } from '@nestjs/common';
import { createClient, type PostgrestError, type SupabaseClient } from '@supabase/supabase-js';

import { requireEnv } from '#config/require-env.js';
import type { Database } from '#types/supabase-types-adjusted.js';
import { isCloudflareHtmlError, throwSupabaseError } from './supabase.errors.js';

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

  HANDLE_RESPONSE_UNTYPED({ data, error, status }: SupabaseResponse<unknown>): unknown {
    if (error) {
      if (isCloudflareHtmlError(error)) {
        this.logger.warn('Supabase service unavailable (5xx), returning null data');
        return null;
      }
      throwSupabaseError(error, status, this.logger);
    }
    return data;
  }

  handleResponse<T>({ data, error, status }: SupabaseResponse<T>): T {
    if (error) {
      // @TOCHECK :: See if this is sustainable, or whether we need to throw an error (and catch everywhere)
      if (isCloudflareHtmlError(error)) {
        this.logger.warn('Supabase service unavailable (5xx), returning null data');
        return null as T;
      }
      throwSupabaseError(error, status, this.logger);
    }
    return data;
  }
}

@Global()
@Module({
  providers: [ SupabaseService ],
  exports: [ SupabaseService ],
})
export class GlobalSupabaseModule {}
