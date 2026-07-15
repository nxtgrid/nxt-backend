# ADR-007: Configuration & Wiring Mechanism

**Date:** 2026-06-30
**Status:** Accepted (mechanism decided; several refinements deliberately deferred — see "Deferred /
future"). **Amended 2026-07-09** — admin organization becomes DB-native; see "Amendment (2026-07-09)"
below (supersedes part of decisions 1 and 10). **Amended 2026-07-15 (002d)** — the `deployment`
config group is dropped, the wiring mechanism becomes explicit central per-host composition, and the
boot model requires DB for Foundation-wired hosts; see "Amendment (2026-07-15)" below (supersedes
decisions 7 and 10, and the `deployment` subtree of decision 5).

---

## Context

`nxt-backend` is moving from company-specific code to a single-track, self-hostable OSS suite
(ADR-004). Operator-specific behavior must be expressed through a **config file + environment
variables**, never a fork. This ADR decides how configuration is **declared, loaded, validated, and
wired** in the NestJS codebase, resolving the stub deferred from ADR-004.

### Inherited constraints (from ADR-004)

- **Three-tier, per-deployment, static flag model**, resolved at boot:
  - **Tier 1 — Capability** on/off.
  - **Tier 2 — Provider** per capability port (adapter selection, or "none-yet").
  - **Tier 3 — Integration** optional augmentations (Make.com, FlowXO, JIRA, Telegram, Sentry/Loki).
- Honesty rules: required ports with no adapter must not crash; optional integrations absent are
  silently skipped; inter-capability links degrade gracefully.
- Ports-and-adapters: capabilities expose ports; vendor adapters implement them, selected by config.
- Disabled capabilities are **not instantiated at all**.
- One config file + env fully determines a deployment; **no secrets in the config file**.

### Current state (as observed)

- Config is read ad hoc from `process.env` across ~40+ files (e.g. `FlutterwaveService` reads
  `process.env.FLW_*` at init). Each app has a large flat `.env.example`.
- `dotenv-safe` is a dependency but is actually invoked in exactly one place
  (`libs/timeseries/ormconfig.ts`); every README still says "fill in **all** values."
- `@nestjs/config` is **not** used anywhere (only mentioned in this stub previously).
- Conditional loading already exists in a primitive form: `app.module.ts` gates its entire `imports`
  array on `process.env.IS_HIBERNATED === 'true' ? [] : [...]`.
- Company-specific data-references are hardcoded in `libs/core/src/constants.ts`:
  `NXT_ORG_ID = 2` (the "admin" organization, used for `is_nxt_grid_member` in both auth strategies,
  to gate `epicollect`, and as the payout recipient in `payouts.service.ts`) and
  `BANKING_SYSTEM_WALLET_ID = 968`.

---

## Decisions

### 1. One unified config surface; three value categories; secrets in env only

A single config artifact carries three distinct kinds of value:

- **(A) Topology** — capability / provider / integration flags (*what code runs*).
- **(B) Data-references** — deployment-specific row identifiers such as the admin organization and the
  system wallet (*which rows in this deployment's DB are special*).
- **(C) Presentation / content** — branding, platform name, hardcoded API/error message strings
  (*browser-safe content*; the most CMS-natural category).

Secrets, 3rd-party API credentials, and DB connection strings stay in **environment variables**, never
in the config artifact. The config artifact is therefore **non-sensitive** and safe to place in a plain
env var or an object-store URL.

The admin organization is a **config-supplied id** (category B), **not** a new DB column/flag: it is a
deployment-wide singleton that must be known before DB-dependent code initializes, and a config value
is trivially overridable per environment without a data migration.

> **Amended 2026-07-09** — this classification is superseded for the admin organization specifically:
> it is now DB-native (`organizations.organization_type = 'PLATFORM_OPERATOR'`). See "Amendment
> (2026-07-09)" below. The rest of decision 1 (topology/presentation categories, secrets-in-env) is
> unaffected.

### 2. Canonical format = JSON; contract = Zod; no `@nestjs/config`

- The canonical artifact is **plain JSON** — exactly what a future CMS dump emits natively, so there is
  zero format drift between a hand-authored file today and a CMS-generated file later, and it is
  language-agnostic so it can also feed the frontend.
- The authoritative contract is a **Zod schema** living in `libs/core`. It both validates at runtime
  and yields inferred TypeScript types from one source.
- **`@nestjs/config` is intentionally not adopted.** Our core requirement is import-time conditional
  module loading (deciding which modules even get imported); that decision runs *before* Nest's DI
  container exists, so a DI-based `ConfigService` would force awkward async-module gymnastics. A plain
  frozen object available at import time is the right primitive. Code owns the contract; the CMS/operator
  owns the values.

### 3. Loader and access

- A tiny custom loader runs in `main.ts` **before** `NestFactory.create`:
  **resolve → `JSON.parse` → Zod `.parse()` → `Object.freeze` → `setConfig()`**.
- All code — services, strategies, controllers, and the import-time composition functions — reads config
  through a single global accessor **`getConfig()`** (exported from `@core/config`). No DI token, no
  constructor wiring, no `forRootAsync`. `getConfig()` throws a clear error if called before the config
  is set.
- Tests override config by calling `setConfig(testConfig)` in setup. (Trade-off: a global singleton is
  marginally less "pure" than DI injection for unit tests; accepted in favour of zero-wiring access.)
- The explicit bootstrap step is also what lets the asynchronous `NXT_CONFIG_URL` source slot in later
  without restructuring.

### 4. Delivery to a no-fork deployment

The operator runs the OSS image directly and must inject their own values without forking. **Env supplies
the pointer (and the secrets); the artifact supplies everything else.** A resolver picks the source by
precedence:

**`NXT_CONFIG_JSON` (inline) → `NXT_CONFIG_URL` (fetch) → `NXT_CONFIG_PATH` (file) → bundled
`config.default.json`.**

- On DigitalOcean App Platform (the initial target — stateless, env-var-oriented, no volume mounts):
  start with **inline `NXT_CONFIG_JSON`** or a **DO Spaces URL**.
- Docker/k8s operators later use `NXT_CONFIG_PATH` (bind-mount / ConfigMap).
- The repo ships only: the Zod schema, a documented **`config.example.json`**, and a safe minimal
  **`config.default.json`** (everything-off-but-bootable, so a bare clone runs in evaluation mode).

### 5. Top-level schema shape

Organized by concern, with capabilities self-contained:

```jsonc
{
  "$schemaVersion": "1",
  "deployment": {            // (B) data-references
    "adminOrganizationId": 2,
    "systemWalletId": 968
  },
  "public": {                // (C) presentation/content — the ONLY browser-safe subtree
    "platformName": "NXT",
    "messages": { }
  },
  "capabilities": {          // (A) Tier-1 (enabled) + Tier-2 (provider/adapter) co-located
    "production": { "enabled": true },
    "metering":   { "enabled": true, "deviceAdapters": [ { "adapter": "calin-api-v2" }, { "adapter": "calin-lorawan" } ] },
    "payments":   { "enabled": true, "providers": [ { "provider": "flutterwave" } ] }
  },
  "integrations": {          // (A) Tier-3 optional augmentations
    "sentry":   { "enabled": true },
    "telegram": { "enabled": false }
  }
}
```

`$schemaVersion` is validated at boot; a mismatch is rejected with a clear error (guards against a stale
CMS dump silently mis-wiring a deployment).

### 6. Tier-2 cardinality and the role of adapters in config

- Per-port cardinality: a **scalar** where a port is genuinely single-provider, a **list of config
  objects** where multiples are real (e.g. multiple payment providers, multiple metering hardware
  adapters). A list-of-one is allowed but not forced.
- Each adapter entry is an **object even when it currently holds only an id**, so non-secret per-adapter
  settings can be added later without a schema break. Secrets stay in env, keyed by an adapter naming
  convention (`CALIN_V2_*`, `FLW_*`).
- **An adapter is listed in config if and only if its presence changes wiring or required secrets.** Its
  per-request **routing stays data-driven** (e.g. `device-messages` selects an adapter per message from
  the device's `manufacturer + protocol`); config only *constrains* the runtime route map to the enabled
  set and degrades gracefully for anything outside it.
- The adapter list is **owned by the capability**. When a capability (e.g. `device-messages`) is later
  extracted into its own service, that config section travels with it; the core retains only the
  `manufacturer`/`protocol` domain enums (code, not config) that other layers need.

### 7. Wiring mechanism — light and decentralized

- Each app keeps an explicit **`alwaysOn` base array** (platform core), free to differ per host.
- Each capability owns a small co-located **contribution function** `xModules(config)` that returns its
  module group (one boolean toggles the whole group) and performs Tier-2 **`forRoot()`** adapter binding.
- Each app composes by spreading: `imports = [ ...alwaysOn, ...meteringModules(config), ... ]` — the
  direct descendant of today's `IS_HIBERNATED` ternary.
- A **central capability registry is explicitly not built now** (see Deferred / future for its benefits).

### 8. Honesty rules — fail-fast baseline

- Capability **disabled** → not instantiated (Tier-1, via the contribution function).
- Capability **enabled but missing required follow-up** (no provider, or a chosen provider's
  secrets/settings absent) → **boot blocks with a clear `MISSING …` message**. Pretending is worse than
  refusing to start.
- Optional **integration** (Tier-3) not enabled → **silently skipped** (this is not "configured-but-
  incomplete", so it is not an error).

### 9. Validation and secrets-linkage

- **Layer 1 — Zod shape:** field types, `$schemaVersion`, and that every `provider`/`adapter` id is a
  known enum value. Precise path-based errors.
- **Layer 2 — secret presence:** **each adapter declares the env keys it needs, co-located with the
  adapter**, and validates them at its own wiring point (`forRoot`/constructor), failing fast per-adapter.
  The config file references adapters by id; the file↔env link is declared once, beside the adapter.
- The global `dotenv-safe` "require all of `.env.example`" model is **not used in the apps** (they will
  never have all variables filled); `.env.example` stays as human documentation. `dotenv-safe` may remain
  in `libs/timeseries` or be removed — no dependency on it either way.

### 10. Data-references / admin organization

- Move `NXT_ORG_ID` → `deployment.adminOrganizationId` and `BANKING_SYSTEM_WALLET_ID` →
  `deployment.systemWalletId`; **delete them from `libs/core/src/constants.ts`**.
- All call sites (both auth strategies, `epicollect.controller.ts`, `payouts.service.ts`) read via
  `getConfig().deployment.*` — a near-mechanical find-and-replace, not a constructor refactor.

> **Amended 2026-07-09** — `adminOrganizationId`'s *source of truth* moves to the database (see
> Amendment below); `systemWalletId` is unaffected and still follows this decision as originally
> written. How backend/frontend call sites resolve the now-DB-native admin organization is **not yet
> decided** — see Amendment "Open / deferred."

### 11. Frontend/backend shared artifact

- The **distribution mechanism to the frontend is deferred** (it belongs with the CMS-era work).
- The only commitment now is **schema hygiene**: all browser-safe values live under the single `public`
  subtree, and nothing sensitive is ever placed there — so the frontend can later receive *just that
  subtree* without disentangling fields.

---

## Amendment (2026-07-09) — admin organization becomes DB-native

**Context:** surfaced during 002b Task 3c (schema programmability review). Postgres RLS
(`rls_check_if_nxt_member()`, hard-coded `nxt_org_id := 2`) cannot call `getConfig()` — the admin
organization must be resolvable **inside the database**, and RLS is on the hot path, so the resolution
must be fast (no per-row DB lookup).

**Decision:** the single source of truth for "which organization is the platform operator" moves from
the config artifact (`deployment.adminOrganizationId`, decisions 1/10 above) to the database itself:

- `organization_type_enum` gains a new value: **`PLATFORM_OPERATOR`**.
- A partial unique index enforces **at most one** organization with that type:
  ```sql
  CREATE UNIQUE INDEX one_platform_operator_org
    ON organizations (organization_type)
    WHERE organization_type = 'PLATFORM_OPERATOR';
  ```
- A trigger on `organizations` (`AFTER INSERT OR UPDATE OF organization_type` and `AFTER DELETE`) keeps
  a fast-read cache in sync: a Postgres **custom GUC** (`app.admin_organization_id`), set via both
  `SET` (immediate effect for the current session) and `ALTER DATABASE … SET` (durable — applied to
  future connections) whenever the flag changes.
- RLS reads the GUC via `current_setting('app.admin_organization_id', true)` — an in-memory,
  zero-I/O read — instead of a live `organizations` lookup (index + heap fetch + MVCC check on every
  evaluation). The renamed function (`rls_check_if_admin_org_member()`, replacing
  `rls_check_if_nxt_member()`) is also marked `STABLE` so Postgres evaluates it once per statement,
  not once per row.
- Setup flow: create the platform-operator organization (Supabase UI or SQL), set its
  `organization_type = 'PLATFORM_OPERATOR'`; the trigger records its id automatically. No manual script
  required for the common path (a script remains a fine manual fallback/override).

**Rationale:** the value is a fact about which row in `organizations` is special, not a boot-time
topology decision — none of its current call sites (`api-key.strategy.ts`, `supabase.strategy.ts`,
`payouts.service.ts`) gate module composition or run before the DB is available, so decision 1's
original justification ("must be known before DB-dependent code initializes") does not hold for this
specific value. Flipping the flag is also friendlier to operate (an `UPDATE` + trigger) than editing
and redeploying the config artifact. `PLATFORM_OPERATOR` (not `SUPERADMIN`) avoids colliding with
`member_type_enum.SUPERADMIN`, which is an unrelated concept (a **member's** role within an org).

**Superseded:** decision 1's classification of the admin organization as "category B, config-supplied,
not a DB column/flag" (now DB-native for this value only). Decision 10's plan to have all consumers
read `getConfig().deployment.adminOrganizationId` populated from the JSON artifact is superseded for
the *source of truth*; how each consumer resolves the value is **open** (below). `systemWalletId` is
unaffected by this amendment.

**Open / deferred (do not lose these):**

- **Backend consumers:** keep the `getConfig().deployment.adminOrganizationId` call sites, but populate
  that field from the DB (query/cache at boot) instead of the JSON artifact — or have consumers query
  `organizations` directly (cached, not per-request). Not decided.
- **Frontend consumers:** qilin/pegasus/eos/niffler/sphinx may need the same fact (e.g.
  `is_nxt_grid_member`-style checks). If the DB is the source of truth, frontend delivery needs its own
  resolution path (API endpoint, or republish into the shared config artifact from the DB at
  build/boot time). **Not decided** — revisit alongside the frontend config delivery decision already
  deferred in decision 11.
- **GUC propagation lag:** `ALTER DATABASE … SET` only takes effect for *new* connections; already-open
  pooled connections keep the old value until they reconnect. Acceptable for a value that changes at
  most once per deployment lifetime; document for operators.
- **Trigger function privilege:** needs `SECURITY DEFINER`, owned by a role with privilege to
  `ALTER DATABASE` (typically `postgres`, which owns the database in Supabase-hosted projects) —
  confirm this holds for self-hosted/vanilla Postgres adopters at Task 5/8.

**Recorded in:** `docs/plans/002-oss-migration/002b-schema-programmability-review.md` (H1c) and
`002b-schema-deviation-register.md` (register #22, Programmability adjustments) — 002b Task 3c.

> **Amended 2026-07-13 (002b Task 8)** — the GUC + `sync_admin_organization_id_guc` trigger
> mechanism above is **superseded in the shipped baseline**. Supabase runs migrations as
> non-superuser `postgres`, which cannot `ALTER DATABASE … SET` custom parameters (bootstrap
> failed with `42501`); assigning the trigger function to `supabase_admin` in-migration also
> fails (`must be able to SET ROLE "supabase_admin"`). **Shipped implementation:** drop the GUC
> trigger; `rls_check_if_admin_org_member()` reads the `PLATFORM_OPERATOR` row directly
> (`LANGUAGE sql STABLE`, `one_platform_operator_org` index). Enum value + partial unique index
> unchanged. Post-migration bootstrap: `docs/deployment/supabase.md` §5. Register #22 +
> Programmability adjustments §3 updated. The "GUC propagation lag" and "Trigger function
> privilege" open items below are **closed** by this amendment.

---

## Amendment (2026-07-15) — 002d Foundation import: wiring, `deployment` drop, boot model

Surfaced while planning the platform-core import
(`docs/plans/002-oss-migration/002d-platform-core-import.md`). Three related changes.

### A. Wiring is explicit central per-host composition (supersedes decision 7)

Decision 7's per-capability **contribution functions** (`xModules(config)`) are **not adopted**.
The temporary `demoModules(getConfig())` scaffold from 002c is their last vestige and is removed in
002d. Instead:

- Each host composes its own module list **explicitly and centrally** in its `app.module.ts` using
  plain named arrays — an `infrastructure` array and a `foundation` array — plus **inline Tier-1
  conditionals** for capabilities (`...(cfg.capabilities.metering?.enabled ? [MeteringModule] : [])`).
- There is **no shared "always-on" constant** across hosts: `api` and `worker` each list their own
  infrastructure/foundation modules, so each host's composition is readable in one place. (`api`'s
  Foundation is large; `worker`'s is small.)
- **Per-capability / per-adapter fail-fast stays where decision 9 (Layer 2) put it** — inside the
  module/adapter's own wiring (`forRoot`/constructor via `requireEnv`), not in a wrapper function.
- **Extract trigger:** keep composition inline in `app.module.ts` until it gets crowded (~20+
  imports, or when Tier-2 `forRoot` wiring starts obscuring the Tier-1 booleans), then move it to a
  co-located `app.composition.ts`. Not a lib.

The **central capability registry** (Deferred / future) remains the eventual home for auto-derived
host composition and the effective-config report; this amendment does not build it, and the explicit
arrays refactor into it cleanly if/when it lands.

### B. The `deployment` config group is dropped (supersedes decision 10; closes the 07-09 open item)

The entire `deployment` subtree (`adminOrganizationId`, `systemWalletId`) is **removed from the
config schema** (decision 5's shape and decision 10 no longer apply). Rationale: every consumer of
both values lives in a **deferred capability**, so nothing in the Foundation reads either one, and
keeping empty config surface invites premature coupling.

- **`adminOrganizationId`** — already DB-native since the 2026-07-09 amendment
  (`organizations.organization_type = 'PLATFORM_OPERATOR'`). Its **backend consumers** (the
  `payouts.service.ts` / `epicollect` gate) resolve it **DB-side within their owning capability**
  (Payments / Field Ops) when those capabilities are imported — **not** via a config field. This
  **closes** the 2026-07-09 "Open / deferred → Backend consumers" item (the answer is: no
  config-populated field; resolve DB-side per consumer). Foundation auth does **not** compute an
  admin-org membership flag in 002d (no in-scope reader); when reintroduced it is named
  `is_admin_org_member` (was `is_nxt_grid_member`).
- **`systemWalletId`** — returns as **`bankingSystemWalletId`** under `capabilities.payments`
  (owned by the Payments capability), **not** a resurrected top-level `deployment` group, when
  Payments is imported.
- **Frontend resolution** of the admin-org fact remains open (unchanged) — see the 2026-07-09
  Amendment "Open / deferred → Frontend consumers" and decision 11.

### C. Boot model — Foundation-wired hosts require the database (refines decision 4 "evaluation mode")

Once a host wires Foundation/Supabase infrastructure, it **requires DB connectivity and fails fast
on missing `SUPABASE_*` env** at boot (`requireEnv` in the Supabase provider). "Evaluation mode"
(decision 4 — "a bare clone runs") is clarified to mean **capabilities off + a local Supabase**, not
**DB-less**. Both `api` and `worker` wire Supabase infra in 002d, so both require DB env from then
on. Per-host env differs: admin-client vars (`SUPABASE_API_URL`, `SUPABASE_SERVICE_ROLE_KEY`) on
both; `SUPABASE_ANON_KEY` + `SUPABASE_JWT_SECRET` only where auth runs (`api`). `SupabaseService`
builds its client in a **provider** (no import-time `export const supabase` singleton); the
query-type-generation shortcut returns later as a **type-only probe** (no runtime client).

**Superseded by this amendment:** decision 7 (contribution functions) in full; decision 10 and the
`deployment` subtree of decision 5's schema shape; the 2026-07-09 "Backend consumers" open item
(now resolved as DB-side-per-consumer).

---

## Consequences

### Positive

- A new operator configures the whole suite from one JSON artifact + env, with clear boot errors.
- The config artifact is non-secret, so it is safe to inline, host on Spaces, or eventually CMS-dump.
- Format and contract are stable from hand-authored bootstrap through to CMS generation (no drift).
- Disabled capabilities are never instantiated; only enabled adapters' secrets are required.
- Adding a provider/adapter is a localized change (an enum value + a config object shape + the adapter's
  own declared env), not edits across many files.
- Migrating the company-specific constants is mechanical and removes hardcoded company identity from code.

### Negative / Risks

- A global `getConfig()` singleton is less DI-pure (mitigated by `setConfig()` in tests).
- Per-adapter fail-fast means boot stops at the first misconfigured adapter rather than reporting all at
  once (accepted; aggregation is a noted future nicety).
- Light decentralized wiring means there is no single machine-readable capability table yet, so the
  effective-config report and api/worker host composition cannot be auto-derived until a registry exists.
- The async `NXT_CONFIG_URL` path adds a boot-time network dependency when adopted.

---

## Deferred / future (do not lose these)

- **Generated JSON Schema** from the Zod schema — for editor autocomplete/validation and to drive CMS
  form generation. Purely additive; the Zod schema is the contract regardless.
- **`NXT_CONFIG_URL` boot-time fetch** and **build-time CMS-dump baking** (e.g. DatoCMS static dump via
  API key before the build) — the resolver is designed so both slot in without code restructuring.
- **Central capability registry** — a single declarative table `{ key, module, host-role, required-env }`.
  Benefits to revisit when tooling demands it: an auto-assembled **effective-config report** and
  **config-driven api/worker host composition** (ADR-004 decision 8). The light contribution functions
  refactor into it trivially.
- **Null/manual adapter ("manual mode")** — a friendlier alternative to boot-error for ports that have a
  genuine manual fallback. Future **per-port opt-in**; the policy (`whenUnprovided`) lives co-located with
  the port definition inside the capability.
- **Aggregated `MISSING …` list** — collect all missing env across all enabled adapters into one boot
  message instead of failing on the first.
- **Effective-config report at boot** — a concise, secret-redacted summary (schema version, admin org,
  enabled capabilities, bound adapter per port, active integrations).
- **DB existence validation of `adminOrganizationId`** — a warn-level boot check that the configured admin
  org actually exists in `organizations` (kept out of the baseline to keep boot DB-free).
- **Frontend config delivery** — choose between build-time injection and a public `GET /config` endpoint,
  alongside the CMS work; only the `public` subtree is ever exposed.

## Out of scope (per ADR-004)

- Full per-tenant capability **entitlements** (the flag model is per-deployment, not per-organization).
- **Per-organization provider overrides** (generalizing ADR-003 per-org Flutterwave credentials) — a
  niche secondary feature for specific deployments, not part of the baseline OSS model.

## Related

- **ADR-004** — target architecture; three-tier flags (decisions 6, 7), host composition (decision 8).
- **ADR-008** — migration strategy; this mechanism is the Phase-1 config skeleton that each capability
  plugs its flags into during Phase-4.
- **ADR-003** — per-org Flutterwave credentials; the deferred per-org provider-override case.
- **ADR-001** — when to extract an adapter abstraction (second real adapter).

## Triggers (revisit this ADR when)

- A capability needs to differ per organization within one deployment (reopens ADR-004 decision 7).
- The effective-config report or automated host composition becomes needed (build the central registry).
- A port gains a real manual-mode fallback (introduce the null/manual adapter + `whenUnprovided` policy).
- The CMS integration lands (formalize generated JSON Schema, URL/build-time delivery, and FE distribution).
- The frontend config delivery mechanism is designed (resolve how the now-DB-native
  `adminOrganizationId` reaches frontend apps — see Amendment "Open / deferred").
- ~~Backend consumers of `getConfig().deployment.adminOrganizationId` are touched (002b Task 5/8) —
  decide DB-populated-config vs. direct-DB-query at that point.~~ **Resolved 2026-07-15 (002d):** the
  `deployment` group is dropped; backend consumers resolve the admin org **DB-side within their
  owning capability**. See "Amendment (2026-07-15) → B".
