import { Global, Injectable, Module } from '@nestjs/common';
import { createClient, type PostgrestError, type SupabaseClient } from '@supabase/supabase-js';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { requireEnv } from '../../config/require-env.js';
import type { Database } from '../../types/supabase-types-adjusted.js';
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

  constructor(
    @InjectPinoLogger(SupabaseService.name) private readonly logger: PinoLogger,
  ) {
    this.adminClient = createClient<Database>(
      requireEnv('SUPABASE_API_URL'),
      requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
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
