import { getLocalSupabaseEnv } from '../../helpers/local-supabase-env.js';

describe('getLocalSupabaseEnv', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns null when SUPABASE_URL is missing', () => {
    delete process.env.SUPABASE_URL;
    process.env.SUPABASE_SECRET_KEY = 'test-secret';

    expect(getLocalSupabaseEnv()).toBeNull();
  });

  it('returns null when SUPABASE_SECRET_KEY is missing', () => {
    process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
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
