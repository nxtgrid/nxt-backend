# ADR-003: Per-Organization Flutterwave Credentials

**Date:** 2026-05-11
**Status:** Proposed (design recommendation, not yet acted on)

---

## Context

Currently the platform uses a single Flutterwave account (credentials stored as `FLW_PUBLIC_KEY` / `FLW_SECRET_KEY` in the tiamat `.env`) for all inbound payment flows: meter top-ups (both via the inline Checkout SDK and USSD charges) and organization/agent wallet top-ups.

Grid owners (organizations) want to use their own Flutterwave merchant accounts for payments on their grids. This would:

- Remove the accounting and settlement burden from NXT Grid.
- Let each organization configure their own payout schedule and bank account directly with Flutterwave.
- Allow NXT Grid to stay as the fallback/default account for any organization that has not configured their own.

Scope confirmed:
- **Inbound charges only** (meter top-ups, wallet top-ups). Payouts are out of scope.
- **Internal-only onboarding** — credentials are set by NXT Grid staff, not by the organization admin themselves.
- Flutterwave sub-merchant / connected-accounts are not available in our market.

---

## Current Architecture

### Backend (`tiamat`)

`FlutterwaveModule` is `@Global()` and exports a singleton `FlutterwaveService`. The service instantiates a single SDK client at module init using `process.env.FLW_PUBLIC_KEY` and `process.env.FLW_SECRET_KEY`:

```ts
// apps/tiamat/src/modules/flutterwave/flutterwave.service.ts
this.flw = new Flutterwave(process.env.FLW_PUBLIC_KEY, process.env.FLW_SECRET_KEY);
```

Three active call sites:

| Call site | Method | Notes |
|-----------|--------|-------|
| `OrdersService.verifyFlutterwaveOrder` | `verifyTransactionByExternalReference` | Called from webhook + private verify endpoint |
| `UssdSessionsService.initiateUSSDCharge` | `createChargeByUSSD` | Initiates USSD payment |
| `FlutterwaveController.webhook` | indirectly via `OrdersService` | Single shared webhook URL |

### Frontend (`qilin` / `niffler` / `pegasus`)

The Flutterwave public key is a build-time env variable (`VITE_FLUTTERWAVE_PUBLIC_KEY`), embedded in the shared `useFlutterwave()` composable at `qilin/shared/composables/flutterwave/index.js`. The inline Checkout SDK (`FlutterwaveCheckout`) is loaded from `checkout.flutterwave.com/v3.js`.

### Data model (relevant excerpt)

- `organizations` — owns one or more `grids`.
- `grids` — each grid belongs to one `organization`.
- `meters` → `connections` → `customers` → `grids` → `organizations` — full traversal already present in Supabase queries in `orders/lib/supabase.ts`.
- `orders` currently has no direct `organization_id` column, but the organization can always be inferred via the receiver wallet chain. This traversal happens at order creation time but is not cached on the row.

Every payment flow can already be traced to an `organization_id`:
- Meter top-up: `receiver_wallet.meter.connection.customer.grid.organization_id`
- Org/agent wallet top-up: `receiver_wallet.organization_id`

---

## Decision

### 1. Credential storage — Supabase Vault (`pgsodium`)

Supabase ships the `pgsodium` extension with a managed Vault. Secrets are stored encrypted in `vault.secrets`, decryptable only through the `vault.decrypted_secrets` view, which is inaccessible to the `anon` and `authenticated` roles. The `service_role` key held by tiamat is the only runtime access path.

**Schema additions on `organizations`:**

| Column | Type | Notes |
|--------|------|-------|
| `flutterwave_enabled` | `boolean not null default false` | Feature flag; if `false`, platform account is used |
| `flutterwave_public_key` | `text null` | Public key — safe to store plaintext; Flutterwave exposes it to browsers |
| `flutterwave_secret_key_id` | `uuid null` | FK → `vault.secrets(id)` |
| `flutterwave_webhook_secret_id` | `uuid null` | FK → `vault.secrets(id)` (the `verif-hash` Flutterwave uses to sign webhook payloads) |

**RLS:** deny `select` on all three new columns to `anon` and `authenticated` roles. Only `service_role` may read them.

**Database RPC** `get_flutterwave_credentials(p_organization_id int)`:
- Returns `(public_key text, secret_key text, webhook_secret text)`.
- `security definer`, owned by a role that can read `vault.decrypted_secrets`.
- Returns `null` for each field if `flutterwave_enabled = false`, causing the service layer to fall back to platform credentials.
- Never logged, never appears in Supabase's query log at the value level (pgsodium decryption is opaque to the Postgres log).

**Key rotation:** insert a new row in `vault.secrets`, update `organizations.flutterwave_secret_key_id` to the new UUID, delete the old vault row. Atomic and audit-friendly.

### 2. Routing key — persist `organization_id` on `orders`

Add an `orders.routing_organization_id` column (`int null, FK → organizations`). Populate it at order creation time in both `initialisePublic` and `initialisePrivate` in `OrdersService`. This means verification, webhook handling, and any future reconciliation can resolve the correct credentials with a single column read instead of re-traversing the wallet graph.

### 3. Backend service — factory pattern replacing the singleton

`FlutterwaveService` becomes a **factory** rather than a constructor-bound singleton. The public interface gains one method:

```ts
flutterwaveService.forOrganization(organizationId: number | null): FlutterwaveClient
```

`FlutterwaveClient` is a thin wrapper that holds the resolved keys and exposes `verifyTransactionByExternalReference`, `createChargeByUSSD`, etc.

**Resolution logic inside `forOrganization`:**

1. If `organizationId` is `null`, or if `flutterwave_enabled = false` for that org, return a client built from `process.env.FLW_PUBLIC_KEY` / `process.env.FLW_SECRET_KEY` (existing behaviour, no regression).
2. Otherwise, call the `get_flutterwave_credentials` RPC, construct and return a per-org client.

**Short-TTL in-memory cache** (e.g. 5 minutes, simple LRU keyed by `organization_id`): avoids a DB round-trip on every webhook. Cache is invalidated automatically when `flutterwave_secret_key_id` changes because the next RPC returns a different value.

All three existing call sites (`OrdersService`, `UssdSessionsService`, `FlutterwaveController`) are updated to call `forOrganization(order.routing_organization_id)` instead of using the injected singleton directly.

### 4. Webhook routing

Flutterwave signs webhook payloads with a `verif-hash` that is set in the merchant's dashboard. With N merchant accounts, the single shared hash check no longer works.

**Approach: per-merchant webhook URL**

Register `POST /flutterwave/webhook/:organizationId` in each org's Flutterwave dashboard alongside their API keys. The controller:

1. Reads `organizationId` from the path param.
2. Calls `flutterwaveService.forOrganization(organizationId)` to get the correct `webhook_secret`.
3. Validates `verif-hash` header against that secret. Returns `400` if invalid.
4. Passes to `OrdersService.verifyFlutterwaveOrder(...)` as today.

The existing `POST /flutterwave/webhook` (no path param) remains as the platform-account route and continues to validate against `process.env.FLW_WEBHOOK_SECRET` (add this env var if not present).

### 5. Frontend — runtime public key resolution

The Flutterwave public key must be known to the browser at checkout time to initialize the inline SDK. Instead of a build-time env var, the key is returned at runtime from the order-initialization endpoints:

- `POST /orders/flutterwave/initialise` and `POST /orders/flutterwave/initialise/public` both return a new `flutterwave_public_key` field in their response.
- The backend resolves it from the org's credentials (or falls back to `process.env.FLW_PUBLIC_KEY`).
- `useFlutterwave().pay(paymentData)` accepts an optional `public_key` override. If provided, it uses that instead of `import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY`.
- `VITE_FLUTTERWAVE_PUBLIC_KEY` stays in place as the build-time fallback for any path that does not go through an initialize call (backwards compatibility).

No secret is ever sent to the browser. The public key (`FLWPUBK_…`) is already exposed in browsers by Flutterwave's own design.

---

## Consequences

### Positive

- Platform account remains the safe default for all orgs; zero behaviour change until `flutterwave_enabled` is flipped.
- Secrets are encrypted at rest in Supabase Vault; plaintext never crosses the wire; decryption is opaque to the Postgres log.
- Key rotation is a single row update + vault insert; no app redeployment required.
- No new infrastructure — Vault is already shipped with our Supabase project.
- The `routing_organization_id` column on `orders` makes all downstream reads (verify, webhook, audit) O(1) instead of a multi-join traversal.

### Negative / Risks

- Tighter coupling to Supabase. If we ever migrate off Supabase, the Vault-backed columns need a migration path (trivially re-encrypted with Option B below).
- Adds a DB round-trip per unique org per cache TTL window in the hot path. Mitigated by the in-memory cache.
- Per-org webhook URLs must be manually registered in each org's Flutterwave dashboard — an ops task, not automated.
- `pgsodium` / Vault must be confirmed enabled on the project before implementation begins (a one-command check against the Supabase dashboard).

---

## Rejected Alternatives

### Option B — App-level AES-256-GCM with a master key in env

Store `flutterwave_secret_key_ciphertext` (bytea) + `iv` + `auth_tag` in Postgres, encrypt/decrypt in tiamat using a `FLW_TENANT_MASTER_KEY` env var. Viable fallback if Vault is not available, but moves the master key lifecycle responsibility to us — rotation, backup, distribution to all environments. Adds a homegrown crypto surface area. Not chosen as primary because Vault is already available.

### Option C — Flutterwave connected accounts / sub-merchants

Would have eliminated the secret-storage problem entirely: we reference org payment accounts by `subaccount_id`, never seeing their `FLWSECK_…`. Confirmed not available in our market.

---

## Implementation Checklist (when this is picked up)

1. Confirm `pgsodium` / Vault is active on the Supabase project.
2. Add `flutterwave_enabled`, `flutterwave_public_key`, `flutterwave_secret_key_id`, `flutterwave_webhook_secret_id` columns to `organizations` with appropriate RLS.
3. Add `orders.routing_organization_id` column; populate in `initialisePublic` and `initialisePrivate`.
4. Write `get_flutterwave_credentials` RPC in Supabase.
5. Refactor `FlutterwaveService` into a factory + `FlutterwaveClient` wrapper with LRU cache.
6. Update the three call sites to use `forOrganization(routing_organization_id)`.
7. Add `POST /flutterwave/webhook/:organizationId` controller route; keep existing route as platform fallback.
8. Add `flutterwave_public_key` to the `initialise` and `initialise/public` response payloads.
9. Update `useFlutterwave().pay()` in `qilin` to accept and use a `public_key` override.
10. Add `FLW_WEBHOOK_SECRET` to `.env.example` (platform webhook shared secret, currently missing).
11. Pilot with one org behind `flutterwave_enabled = true`; verify charge → webhook → verify-by-tx-ref end-to-end.
