# Local API smoke tests (httpYac)

File-based requests for the [httpYac](https://marketplace.visualstudio.com/items?itemName=anweber.vscode-httpyac) extension — `.http` files live in the repo next to the API.

## Setup

1. Install **httpYac** VS Code extension (`anweber.vscode-httpyac`) and disable any other http extension you might have.
2. Use the same env as `nx serve api` — httpYac loads `.env` from parent folders
   (`apps/api/.env` / repo root). Needs at least `SUPABASE_PUBLISHABLE_KEY` for login.
3. In the editor status bar, select httpYac environment **`local`** (URLs + seeded users from
   `.httpyac.js`).
4. Local Supabase + seed, and `pnpm exec nx serve api`.

## How to run

Open an endpoint file (e.g. `me.http`) and **Send** a request.  
`# @import ./login.http` + `# @ref loginPlatform` runs the login first (cached until you
force-refresh), then the API call uses `{{loginPlatform.access_token}}`.

## Files

| File | Role |
|------|------|
| `.httpyac.js` | Shared local URLs + seeded emails/passwords |
| `login.http` | Named Supabase password grants (`loginPlatform`, `loginSolar`) |
| `me.http` | Imports login, refs it, calls `GET /auth/me` |
| `user-admin.http` | Task 9: create/update/delete customer, agent, member (+ API-key create-customer) |

## Seeded users

| Persona | Email | Password | Login name |
|---------|-------|----------|------------|
| Platform | `superadmin@nxt-platform.com` | `superadmin` | `loginPlatform` |
| Solar | `admin@nxt-solar.com` | `admin` | `loginSolar` |

New endpoint file pattern:

```http
# @import ./login.http

### Some endpoint
# @ref loginPlatform
GET {{baseUrl}}/…
Authorization: Bearer {{loginPlatform.access_token}}
```

## `user-admin.http` notes

- Seed already covers this: solar org **2**, grid **1**, platform API key. No seed change needed.
- Run requests **top-down** when a step needs a prior `# @name` id (create → update → delete).
- Creates real Auth users; timestamps keep emails unique. If Auth/phone collides, reset:
  `pnpm exec supabase db reset`.
- Machine smoke: **Create customer (X-API-KEY)** — privileged admin path (no user client yet).
