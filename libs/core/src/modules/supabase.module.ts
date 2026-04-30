import { Injectable, Global, Module, HttpException } from '@nestjs/common';
import { createClient, PostgrestError } from '@supabase/supabase-js';
import type { Database } from '@core/types/supabase-types-adjusted';

export const supabase = createClient<Database>(process.env.SUPABASE_API_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const isCloudflareHtmlError = (error: unknown): boolean => {
  const msg = (error as any)?.message;
  // Check if message exists, and if HTML
  if(typeof msg !== 'string') return false;
  const checkableMsg = msg.trim().toLowerCase();
  return checkableMsg.includes('html') || checkableMsg.includes('internal server error');
};

export const throwSupabaseError = (error: unknown, status?: number): never => {
  console.error('[SUPABASE RESPONSE ERROR]', { error, status });
  const message = typeof error === 'string'
    ? error
    : error instanceof Error
      ? error.message
      : (error as any)?.message ?? JSON.stringify(error);
  throw new HttpException(message, status || 500);
};

@Injectable()
export class SupabaseService {
  constructor() { }

  adminClient = supabase;

  HANDLE_RESPONSE_UNTYPED({ data, error, status }) {
    if (error) {
      if(isCloudflareHtmlError(error)) {
        console.warn('Supabase service unavailable (5xx), returning null data');
        return null;
      }
      throwSupabaseError(error, status);
    }
    return data;
  }

  handleResponse<T,>({ data, error, status }: { data: T, error: PostgrestError, status: number }): T {
    if (error) {
      // @TOCHECK :: See if this is sustainable, or whether we need to throw an error (and catch everywhere)
      if(isCloudflareHtmlError(error)) {
        console.warn('Supabase service unavailable (5xx), returning null data');
        return null;
      }
      throwSupabaseError(error, status);
    }
    return data;
  }
}

@Global()
@Module({
  providers: [ SupabaseService ],
  exports: [ SupabaseService ],
})
export class GlobalSupabaseModule {
  constructor() { }
}
