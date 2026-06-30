# ADR-007: Configuration & Wiring Mechanism

**Date:** 2026-06-30
**Status:** Accepted (mechanism decided; several refinements deliberately deferred — see "Deferred / future")

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

### 11. Frontend/backend shared artifact

- The **distribution mechanism to the frontend is deferred** (it belongs with the CMS-era work).
- The only commitment now is **schema hygiene**: all browser-safe values live under the single `public`
  subtree, and nothing sensitive is ever placed there — so the frontend can later receive *just that
  subtree* without disentangling fields.

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
