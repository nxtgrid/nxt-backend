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

From the repo root (Supabase CLI pinned in `package.json`; make sure you have run `pnpm install` first.
Invoke via `pnpm supabase`):

```bash
pnpm supabase login # If not already logged in
pnpm supabase link --project-ref <your-project-ref>
pnpm supabase db push
```

Local development: `pnpm supabase start` applies migrations automatically.

### Verify Data API grants (optional smoke test)

After `db push`, confirm explicit table grants work (register #33) — dashboard “Data API enabled”
alone is not enough:

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "apikey: <SECRET_OR_SERVICE_ROLE_KEY>" \
  -H "Authorization: Bearer <SECRET_OR_SERVICE_ROLE_KEY>" \
  "https://<project-ref>.supabase.co/rest/v1/organizations?select=id&limit=1"
```

Expect **200** (empty `[]` is fine before bootstrap).

**API keys (Supabase dashboard):** Settings → API Keys. New projects show **publishable** and
**secret** keys by default. The familiar **anon** / **service_role** JWT pair lives under the
**Legacy API Keys** tab — use either the secret key or legacy `service_role` for the curl above.

## 5. Bootstrap data

Once per fresh database we need to enter the minimum viable amount of data to get up and running.
Concretely, this means: 
- The operator `organization`
- A `wallet` for that organization
- A supabase `user` (which automatically creates a row in the accounts table too)
- Make that user a `SUPERADMIN` `member` of the operator organization

### Bootstrap Operator (Admin) Organization
Migrations ship schema only. Before the app is usable, add **one platform operator organization**
and **its wallet** (1:1 via `wallets.organization_id`). Only one `PLATFORM_OPERATOR` org is
allowed.

**Dashboard** — Table Editor → `organizations`: insert a row with `organization_type = PLATFORM_OPERATOR`. Then `wallets`: insert a row with `organization_id` set to that org's `id`.

### Bootstrap Superadmin Organization Member 
In the Supabase dashboard, go to Authentication → Users → Add user → Create new user. Enter your
email and password and check **Auto Confirm User**.

If you now go to 'Table editor' -> 'accounts' you see that your account is created. Update the `organization_id` column with the id of your Platform Operator Organization.

After this you can make yourself the SUPERADMIN member of the organization, by going to 'Table editor' -> 'members' -> Insert -> 'Insert row'. Make sure you select `SUPERADMIN` as `member_type` and `account_id` to the `id` of the account that was just created.
