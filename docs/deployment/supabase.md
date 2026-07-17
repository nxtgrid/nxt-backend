# Deployment on Supabase

## 1. Create an account and start a new project on Supabase

[Supabase](https://supabase.com/)

## 2. Create a new organization

In the dashboard. (If you don't already have one.)

## 3. Create a new project

When creating a project, choose a suitable name, and make sure 'Enable Data API' is checked.
Also make sure that 'Automatically expose new tables' and 'Enable automatic RLS' are NOT checked.
Check the location too,

## 4. Connect and apply migrations

From the repo root (Supabase CLI pinned in `package.json`; make sure you have run `pnpm install`
first). Prefer `pnpm exec supabase` so you always hit the pinned binary:

```bash
pnpm exec supabase login # If not already logged in
pnpm exec supabase link --project-ref <your-project-ref>
pnpm exec supabase db push
```

### Local development

```bash
pnpm exec supabase start   # applies migrations on a fresh local DB
pnpm exec supabase db reset  # recreates DB, re-applies migrations, then runs seed.sql
```

`supabase/config.toml` has `[db.seed]` enabled with `sql_paths = ["./seed.sql"]`. Seed runs on
**`db reset`**, not on every plain `start` against an already-initialized volume.

## 5. Local-dev seed (Foundation bootstrap)

Migrations ship **schema only**. For **local development**, Foundation fixtures live in
`supabase/seed.sql` and grow as capability imports land. This seed is **not** for remote/prod —
production still needs an operator-specific one-time bootstrap outside this file.

### Reset and seed

```bash
pnpm exec supabase db reset
```

That drops the local DB, applies migrations, then runs `supabase/seed.sql`.

### What the seed creates

| Fixture | Details |
|---------|---------|
| Orgs | `1` **NXT Platform Operator** (`PLATFORM_OPERATOR`) + wallet; `2` **NXT Solar Developer** (`SOLAR_DEVELOPER`) + wallet |
| Auth users | `superadmin@nxt-platform.com` / `superadmin`; `admin@nxt-solar.com` / `admin` (confirmed; fixed UUIDs in seed) |
| Accounts | Created by `handle_new_user` on auth insert; `organization_id` set via `handle_update_user` when `app_metadata` is applied |
| Claims | JWT `app_metadata`: `account_id`, `account_type` (`MEMBER`), `member_type`, `organization_id` |
| Members | Platform → `SUPERADMIN` (org 1); Solar → `DEVELOPER` (org 2) |
| API key | `dev-api-key-platform-superadmin` on the platform superadmin account (`X-API-KEY` / auth tests) |
| Grid | **Demo Solar Grid** on org 2 |

Invite flow mirrored in SQL: insert auth user → account trigger → update `raw_app_meta_data` →
account `organization_id` sync → insert `members`.

### Sign-in (local)

Use the emails/passwords above against the local Auth API / Studio
(`pnpm exec supabase status` for URLs and keys). Prefer the seeded API key for machine auth
smoke tests (`X-API-KEY` / httpYac under `apps/api/http/`). Api auth also needs
`SUPABASE_PUBLISHABLE_KEY` plus `SUPABASE_JWKS_URL` (or `SUPABASE_JWT_SECRET`) in
`apps/api/.env` — see `apps/api/.env.example`.

### REST / httpYac (manual API checks)

File-based requests live under `apps/api/http/` using **httpYac** (`anweber.vscode-httpyac`).
Shared login via `# @import ./login.http` + `# @ref loginPlatform` — see `apps/api/http/README.md`.
Uninstall Huachao REST Client if present (conflicts on `.http` files).
