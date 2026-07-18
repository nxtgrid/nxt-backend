/**
 * Local Supabase env helpers for integration / e2e suites under `apps/api/test/`.
 *
 * Nx loads `apps/api/.env` then workspace `.env` for `nx test*` the same way as
 * `nx serve api` (project wins on conflicts). Returns null when keys are missing
 * so stack-dependent suites can skip instead of failing a stack-free default run.
 */

/** Seeded in `supabase/seed.sql` — platform SUPERADMIN (org 1). */
export const SEEDED_PLATFORM_API_KEY = 'dev-api-key-platform-superadmin';

export const SEEDED_PLATFORM_SUPABASE_ID =
  'a0000000-0000-4000-8000-000000000001';

export interface LocalSupabaseEnv {
  readonly url: string;
  readonly secretKey: string;
}

export function getLocalSupabaseEnv(): LocalSupabaseEnv | null {
  const url = process.env.SUPABASE_URL?.trim();
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !secretKey) {
    return null;
  }
  return { url, secretKey };
}
