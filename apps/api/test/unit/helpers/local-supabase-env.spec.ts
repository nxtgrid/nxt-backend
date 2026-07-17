import { getLocalSupabaseEnv } from '../../helpers/local-supabase-env.js';

describe('getLocalSupabaseEnv', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns null when SUPABASE_URL or SUPABASE_SECRET_KEY is missing', () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SECRET_KEY;

    expect(getLocalSupabaseEnv()).toBeNull();
  });

  it('returns trimmed url and secret when both are set', () => {
    process.env.SUPABASE_URL = ' http://127.0.0.1:54321 ';
    process.env.SUPABASE_SECRET_KEY = ' test-secret ';

    expect(getLocalSupabaseEnv()).toEqual({
      url: 'http://127.0.0.1:54321',
      secretKey: 'test-secret',
    });
  });
});
