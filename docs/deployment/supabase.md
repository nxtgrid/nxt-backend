# Deployment on Supabase

## 1. Create an account and start a new project on Supabase

[Supabase](https://supabase.com/)

## 2. Create a new organization

In the dashboard. (If you don't already have one.)

## 3. Create a new project

Create and open the new project.

## 4. Connect and apply migrations

From the repo root (pinned CLI: `npx supabase@2.109.1`):

```bash
npx supabase@2.109.1 link --project-ref <your-project-ref>
npx supabase@2.109.1 db push
```

Local development: `npx supabase@2.109.1 start` applies migrations automatically.

## 5. Bootstrap data (once per fresh database)

Migrations ship schema only. Before the app is usable, add **one platform operator organization**
and **its wallet** (1:1 via `wallets.organization_id`). Only one `PLATFORM_OPERATOR` org is
allowed.

Either:

- **Dashboard** — Table Editor → `organizations`: insert a row with
  `organization_type = PLATFORM_OPERATOR`. Then `wallets`: insert a row with `organization_id`
  set to that org's `id`.
- **SQL** — run `supabase/snippets/post-migration-bootstrap-platform-operator.sql` in the SQL
  editor (local Studio or hosted dashboard). Customize the organization `name` if you like.

Customer top-ups later need a separate `BANKING_SYSTEM` wallet and `deployment.systemWalletId` in
config — that belongs with the payments capability setup, not this step.
