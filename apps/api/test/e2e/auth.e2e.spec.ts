import {
  Injectable,
  UnauthorizedException,
  type INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { PassportModule, PassportStrategy } from '@nestjs/passport';
import { GlobalSupabaseModule } from '@nxt/core';
import { Strategy as BearerStrategy } from 'passport-http-bearer';
import request from 'supertest';

import { ApiKeyStrategy } from '../../src/modules/auth/api-key.strategy.js';
import { AuthController } from '../../src/modules/auth/auth.controller.js';
import { AuthenticationGuard } from '../../src/modules/auth/authentication.guard.js';
import {
  getLocalSupabaseEnv,
  SEEDED_PLATFORM_API_KEY,
  SEEDED_PLATFORM_SUPABASE_ID,
} from '../helpers/local-supabase-env.js';

/**
 * Registers Passport name `supabase` so AuthenticationGuard's dual strategy
 * list can run. Always fails — this suite only exercises X-API-KEY.
 *
 * Why not AppModule? Booting AuthModule pulls SupabaseStrategy → ESM-only
 * `jose`, which Jest (CJS) cannot load without a heavier transform harness.
 * Thin slice is intentional until a full-app e2e harness exists; do not
 * proliferate thin modules as the default pattern.
 */
@Injectable()
class StubSupabaseStrategy extends PassportStrategy(BearerStrategy, 'supabase') {
  constructor() {
    super();
  }

  validate(): never {
    throw new UnauthorizedException('Stub bearer strategy — not used in this suite');
  }
}

const localEnv = getLocalSupabaseEnv();
const describeE2e = localEnv ? describe : describe.skip;

describeE2e('GET /auth/me (e2e — X-API-KEY)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ PassportModule, GlobalSupabaseModule ],
      controllers: [ AuthController ],
      providers: [ AuthenticationGuard, ApiKeyStrategy, StubSupabaseStrategy ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        transformOptions: { enableImplicitConversion: false },
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await moduleRef?.close();
  });

  it('returns the seeded platform principal for X-API-KEY', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set('X-API-KEY', SEEDED_PLATFORM_API_KEY)
      .expect(200);

    expect(res.body).toMatchObject({
      email: 'superadmin@nxt-platform.com',
      full_name: 'Platform Superadmin',
      account_type: 'MEMBER',
      member_type: 'SUPERADMIN',
      organization_id: 1,
      supabase_id: SEEDED_PLATFORM_SUPABASE_ID,
    });
    expect(res.body.account_id).toBeGreaterThan(0);
  });

  it('rejects the request when X-API-KEY is missing', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });
});
