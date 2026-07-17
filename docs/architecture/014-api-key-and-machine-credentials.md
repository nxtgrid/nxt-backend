# ADR-014: Machine Credentials — API Keys, Scopes, Postgres Roles, and MCP

**Date:** 2026-07-17  
**Status:** Accepted (direction); implementation lands incrementally with consumers  
**Related:** ADR-004 (Foundation / capabilities), ADR-007 (wiring / secrets), 002d Foundation
import (`auth`, `api-keys`), schema deviation register #2/#3 (company readonly roles)

---

## Context

Foundation authenticates humans via Supabase JWTs (bearer) and machines via `X-API-KEY`
(`public.api_keys`). The API-key path currently resolves a key to an `AuthenticatedUser`
(account / org / member claims) using the **admin** Supabase client and does **not** attach a
per-request user client. Handlers that then use `service_role` bypass RLS.

That is acceptable for a few trusted local/dev machine keys. It becomes dangerous as:

- More integrations need narrow, specific data.
- MCP (and similar agent) servers grow tools and call many endpoints.
- The same powerful key (e.g. platform-operator SUPERADMIN) is reused for every tenant’s MCP
  session, with “who may see what” enforced only in application code.

Separately, the legacy company database provisioned **Postgres login roles**
(`grafana_readonly`, `make_readonly`, `snaplet_readonly_2`) for direct DB access. Those are a
different credential family from Nest API keys and were **omitted from the OSS baseline**
(parameterized company infra).

This ADR records the credential model, when to use which mechanism, and the hardening path —
including for MCP’s two audiences (internal platform ops vs customer-org).

### Why this document is in the open repo

Security **design** (roles, RLS, scopes, least privilege) is already implied by schema and auth
code. Publishing the strategy:

- Helps adopters avoid shipping a single god-key.
- Is not a substitute for secrets management; **keys, passwords, and company recipes stay out of
  git**.

Do **not** put production key material, allowlists of real integrations, or exploit runbooks here.
Company-specific Postgres role recipes remain under operator docs (e.g.
`docs/database/optional/`), not the generic baseline migration.

---

## Decision

### 1. Three credential layers (do not conflate “role”)

| Layer | What it is | Examples | RLS? |
|---|---|---|---|
| **A. Postgres login roles** | DB users that connect with a DB password (Grafana, Make, Snaplet, …) | `grafana_readonly`, `make_readonly` | Policies may target the role; often `USING (true)` read-all for that tool |
| **B. Supabase Data API JWT roles** | Role PostgREST assumes from the JWT | `anon`, `authenticated`, `service_role` | `authenticated` / `anon`: RLS applies. `service_role`: **RLS bypassed** |
| **C. App API keys** | Product machine credentials in `api_keys`, validated by Nest | `X-API-KEY`, seed `dev-api-key-…` | Only if Nest then uses a **user-scoped** client (B=`authenticated`) with that principal’s claims |

Nest `SupabaseService.adminClient` is layer **B / `service_role`**. Bearer auth’s per-request
client is **B / `authenticated`**. API keys are layer **C** until mapped onto B.

### 2. When to use which strategy

| Use case | Prefer | Avoid |
|---|---|---|
| Human operators / dashboards (Pegasus, etc.) | Bearer JWT → `authenticated` + RLS | Long-lived API keys for interactive use |
| Narrow machine job needing one slice of data (report, webhook, single integration) | **Scoped API key** on a least-privilege service account; route allowlist; prefer RLS-bound session | Platform SUPERADMIN key; admin client for the whole request path |
| MCP / agent tools — **customer** (own org’s grids) | Per-tenant (or per-customer-user) session: org-bound claims + **RLS**; scopes limited to MCP tool surface | One shared platform key for all customers; “filter org in MCP code only” |
| MCP / agent tools — **internal team** (cross-org / all grids) | Dedicated **platform-ops** service principal (or platform-operator membership) with **explicit** broad scopes; few keys; audited | Reusing a human SUPERADMIN’s personal key; silent `service_role` for every tool |
| BI / Grafana / ETL reading many tables directly | Postgres role (**A**) + optional `TO <role>` RLS policies; company recipe | Nest API keys “because we already have them” |
| DB cloning / Snaplet-style tooling | Postgres role with needed schema grants (legacy pattern); company recipe | Service role in app config handed to third-party SaaS carelessly |
| Pre-auth / privileged Nest internals (validate API key row, invite user, …) | Admin client (`service_role`) **only** for that privileged step | Admin client as default for all handlers after auth |
| Break-glass / migrations | `service_role` or postgres superuser, offline or tightly gated | Everyday MCP or integration traffic |

### 3. Scopes on API keys

Scopes answer **which capabilities/routes** a key may invoke (e.g. `mcp:grids:read`,
`reports:revenue:read`). They grow with MCP tools and must be **granted deliberately**.

Scopes do **not** replace tenancy. “Which org’s rows?” remains JWT / `app_metadata` claims + RLS
(or an explicit platform-ops policy set).

**Growth rule:** new MCP tool → new scope(s) → grant only to principals that need them. Internal
ops keys may accumulate broader scopes; customer keys stay on a small allowlist.

### 4. MCP must not share one god-key across tenants

If one platform API key backs MCP for every customer and the server filters access in app logic,
that is **authorization in the app instead of (or duplicated poorly beside) RLS**. It does not
scale: every new tool must remember checks; agents can be steered into over-fetching.

**Target:**

- **Customer MCP:** session identity = that org (customer key or short-lived token); DB via
  `authenticated` + RLS.
- **Team MCP:** separate platform-ops principal; broad scopes by design; still prefer
  RLS-bound policies for platform ops over blanket `service_role` for tool handlers.

### 5. Hardening direction (implementation order)

1. **Policy (now):** Never issue platform-operator SUPERADMIN keys to customer MCP or narrow
   integrations. Dedicated service accounts; seed platform key stays **local/dev only**.
2. **Route allowlist:** API-key (and later scoped) principals may only hit approved surfaces
   (e.g. MCP / machine routes), not the full human API by default.
3. **RLS-bound machine sessions:** After API-key (or token-exchange) auth, request handlers use a
   user-scoped Supabase client with that principal’s claims — **not** admin — except true
   privileged steps. (Clarifies: “subject to RLS” is false today for API keys if handlers use
   `service_role`.)
4. **Scopes on `api_keys`:** Persist and enforce scopes in Nest (guard/interceptor). Taxonomy
   owned by Foundation + each capability that exposes machine APIs.
5. **Optional later:** Short-lived token exchange (key → JWT with scopes + expiry); separate MCP
   gateway host; OAuth2 client-credentials for external MCP clients.

### 6. Postgres readonly roles stay company-optional

`grafana_readonly` / `make_readonly` / `snaplet_*` remain **out of the OSS init migration**.
Operators who need them apply recipes; they are not a substitute for designing Nest API keys or
MCP tenancy.

---

## Consequences

- Adopters get a clear map: direct DB tools ≠ Nest API keys ≠ Supabase `service_role`.
- MCP product work must budget for **per-tenant credentials** (or equivalent sessions), not only
  tool implementations.
- Foundation will grow `api_keys` (scopes) and auth middleware; capabilities register scopes for
  their machine endpoints rather than inventing parallel auth.
- Until items 3–4 land, treat existing API keys as **high privilege** and minimize their use and
  distribution.

---

## Notes

- Seed key `dev-api-key-platform-superadmin` is for local Foundation auth tests only.
- Manual API checks: `apps/api/http/` (httpYac); prefer bearer for human-shaped tests.
- Related omission: schema deviation register #2 / #3 (Grafana / Make roles).
