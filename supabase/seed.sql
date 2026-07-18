-- Local-dev Foundation seed (002d Task 5).
-- Runs after migrations on `pnpm exec supabase db reset` (see supabase/config.toml [db.seed]).
-- Not for remote/prod bootstrap.
--
-- 1. organizations + wallets
-- 2. auth users → handle_new_user creates bare accounts
-- 3. app_metadata claims → handle_update_user; then members
-- 4. api_keys + grid on solar org

-- =============================================================================
-- Organizations
-- =============================================================================

INSERT INTO public.organizations (id, name, organization_type)
VALUES
  (1, 'NXT Platform Operator', 'PLATFORM_OPERATOR'),
  (2, 'NXT Solar Developer', 'SOLAR_DEVELOPER');

SELECT setval(
  pg_get_serial_sequence('public.organizations', 'id'),
  (SELECT MAX(id) FROM public.organizations)
);

-- =============================================================================
-- Wallets (1:1 with org for bootstrap; trigger may set rls_organization_id)
-- =============================================================================

-- BEFORE INSERT trigger copies organization_id → rls_organization_id.
INSERT INTO public.wallets (id, organization_id, wallet_type, balance)
VALUES
  (1, 1, 'REAL', 0),
  (2, 2, 'REAL', 0);

SELECT setval(
  pg_get_serial_sequence('public.wallets', 'id'),
  (SELECT MAX(id) FROM public.wallets)
);

-- =============================================================================
-- Auth users (Step 2)
-- =============================================================================
-- Fixed UUIDs so later steps can UPDATE by id.
-- AFTER INSERT trigger public.handle_new_user() creates public.accounts
-- (supabase_id, email, full_name, telegram_link_token) — organization_id stays
-- null until app_metadata is set in Step 3.
-- auth.identities rows are required for email/password sign-in.

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'superadmin@nxt-platform.com',
    extensions.crypt('superadmin', extensions.gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Platform Superadmin"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'admin@nxt-solar.com',
    extensions.crypt('admin', extensions.gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Solar Admin"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

INSERT INTO auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
VALUES
  (
    'a0000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    jsonb_build_object(
      'sub', 'a0000000-0000-4000-8000-000000000001',
      'email', 'superadmin@nxt-platform.com',
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    now(),
    now(),
    now()
  ),
  (
    'a0000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000002',
    jsonb_build_object(
      'sub', 'a0000000-0000-4000-8000-000000000002',
      'email', 'admin@nxt-solar.com',
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    now(),
    now(),
    now()
  );

-- =============================================================================
-- App metadata + members (Step 3) — mirrors inviteMember flow
-- =============================================================================
-- 1) UPDATE auth.users.raw_app_meta_data with ACL claims (account_id from the
--    account the insert trigger just created).
-- 2) AFTER UPDATE trigger public.handle_update_user() copies organization_id
--    onto public.accounts.
-- 3) INSERT public.members; BEFORE INSERT trigger sets rls_organization_id
--    from accounts.organization_id (so step 2 must run first).

UPDATE auth.users AS u
SET
  raw_app_meta_data = coalesce(u.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
    'account_id', a.id,
    'account_type', 'MEMBER',
    'member_type', 'SUPERADMIN',
    'organization_id', 1
  ),
  updated_at = now()
FROM public.accounts AS a
WHERE
  u.id = 'a0000000-0000-4000-8000-000000000001'
  AND a.supabase_id = u.id;

UPDATE auth.users AS u
SET
  raw_app_meta_data = coalesce(u.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
    'account_id', a.id,
    'account_type', 'MEMBER',
    'member_type', 'DEVELOPER',
    'organization_id', 2
  ),
  updated_at = now()
FROM public.accounts AS a
WHERE
  u.id = 'a0000000-0000-4000-8000-000000000002'
  AND a.supabase_id = u.id;

INSERT INTO public.members (account_id, member_type)
SELECT a.id, 'SUPERADMIN'::public.member_type_enum
FROM public.accounts AS a
WHERE a.supabase_id = 'a0000000-0000-4000-8000-000000000001';

INSERT INTO public.members (account_id, member_type)
SELECT a.id, 'DEVELOPER'::public.member_type_enum
FROM public.accounts AS a
WHERE a.supabase_id = 'a0000000-0000-4000-8000-000000000002';

SELECT setval(
  pg_get_serial_sequence('public.members', 'id'),
  (SELECT MAX(id) FROM public.members)
);

-- =============================================================================
-- API key + grid (Step 4)
-- =============================================================================
-- One known key on the platform superadmin account (X-API-KEY / Task 7–8).
-- Grid belongs to NXT Solar Developer (organization_id = 2).

INSERT INTO public.api_keys (id, key, account_id)
SELECT
  1,
  'dev-api-key-platform-superadmin',
  a.id
FROM public.accounts AS a
WHERE a.supabase_id = 'a0000000-0000-4000-8000-000000000001';

SELECT setval(
  pg_get_serial_sequence('public.api_keys', 'id'),
  (SELECT MAX(id) FROM public.api_keys)
);

INSERT INTO public.grids (id, name, organization_id)
VALUES (1, 'Demo Solar Grid', 2);

SELECT setval(
  pg_get_serial_sequence('public.grids', 'id'),
  (SELECT MAX(id) FROM public.grids)
);
