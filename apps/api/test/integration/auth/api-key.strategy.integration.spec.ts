import { UnauthorizedException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { GlobalSupabaseModule } from '@nxt/core';

import { ApiKeyStrategy } from '../../../src/modules/auth/api-key.strategy.js';
import {
  getLocalSupabaseEnv,
  SEEDED_PLATFORM_API_KEY,
  SEEDED_PLATFORM_SUPABASE_ID,
} from '../../helpers/local-supabase-env.js';

const localEnv = getLocalSupabaseEnv();
const describeIntegration = localEnv ? describe : describe.skip;

describeIntegration('ApiKeyStrategy (integration — local Supabase + seed)', () => {
  let moduleRef: TestingModule;
  let strategy: ApiKeyStrategy;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ GlobalSupabaseModule ],
      providers: [ ApiKeyStrategy ],
    }).compile();

    strategy = moduleRef.get(ApiKeyStrategy);
  });

  afterAll(async () => {
    await moduleRef?.close();
  });

  it('resolves the seeded platform API key to AuthenticatedUser claims', async () => {
    const user = await strategy.validate(SEEDED_PLATFORM_API_KEY);

    expect(user).toMatchObject({
      email: 'superadmin@nxt-platform.com',
      full_name: 'Platform Superadmin',
      account_type: 'MEMBER',
      member_type: 'SUPERADMIN',
      organization_id: 1,
      supabase_id: SEEDED_PLATFORM_SUPABASE_ID,
    });
    expect(user.account_id).toBeGreaterThan(0);
    expect(typeof user.validate).toBe('function');
  });

  it('rejects an unknown API key', async () => {
    await expect(strategy.validate('not-a-real-api-key')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
