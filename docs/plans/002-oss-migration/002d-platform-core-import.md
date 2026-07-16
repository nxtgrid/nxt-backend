# 002d — Platform Core Import (Foundation)

**Parent plan:** `docs/plans/002-oss-migration.md` (read it first)
**Decisions:** ADR-004 (capability map / §5 — amended by this plan), ADR-007 (config & wiring —
amended by this plan), ADR-008 (Phase 3 incremental import), **ADR-013** (capability-owned
behavior over shared core entities — *authored by this plan*, Task 1)
**Created:** 2026-07-15
**Status:** Authored 2026-07-15 — execution not started
**Depends on:** 002b (database baseline) and 002c (scaffold, pipeline & config skeleton) complete;
interlock reached 2026-07-14.
**Execution model:** collaborative — division of labor is decided **per task/subtask as we go**
(see "Division of labor" in the parent plan). Ask which mode applies before starting a task.
Per-task `Executor:` notes mark where maintainer credentials/ownership are *required*; everywhere
else the mode is chosen per task. Respect the review cadence — address tasks one at a time,
stopping for review; never run ahead.

---

## Purpose

Import the always-on **platform core** — referred to hereafter as **Foundation** — into the new
workspace as the first real domain code (ADR-008 Phase 3, "platform core before any capability").
Foundation is the identity/access spine every capability depends on: authentication, API keys,
accounts, members, organizations, user administration, and grids, over the cross-cutting infra
(Supabase client, HTTP, logging).

This import is also the point at which several standing debts are paid down deliberately (rule 2):
the operations-database **dual-ORM is retired** (TypeORM → Supabase client), **real structured
logging** replaces `console.*`, the **admin-organization coupling** is removed from the config
surface, and the first **de-Nigeria / de-brand** cleanups land. It establishes the wiring,
testing, and placement patterns that every later capability import copies.

## What "Foundation" is (and is not)

**Foundation is not a library or a single object.** It is the **per-app selection** of always-on
modules. `libs/core` (`@nxt/core`) remains the shared kernel (config, types, cross-cutting infra);
shared domain services live in `libs/core`, app-only pieces (controllers, `auth`, `user-admin`)
live in their app; auxiliary utilities live in `libs/helpers`. Each host composes its own
Foundation explicitly (see Task 4). `api`'s Foundation is large; `worker`'s is tiny.

## Decisions baked into this plan (do not relitigate — see the chat/decisions log)

These were resolved during authoring. Execute to them; if reality contradicts one, stop and raise
it, don't silently diverge.

1. **Scope (see table below).** Foundation = infra + `auth`, `api-keys`, `accounts`,
   `members` (type-only), `organizations`, `user-admin` (whole), `grids` (partial). Deferred /
   re-homed: `download`, `routers`, notification-core, `websocket`, `agents`, `dcus`, `poles`.
   These are **amendments to ADR-004 §5** (Task 1).
2. **Operations-DB TypeORM is dropped entirely.** No ops-DB `*.entity.ts`, no `CoreTypeOrmModule`
   in Foundation. Services are (re-)expressed against the Supabase client using generated
   `supabase-types`. Timeseries TypeORM is untouched (decided at Monitoring, 002e).
3. **Naming:** `@nxt/core` = kernel; the always-on domain layer = **Foundation**, selected per app.
   Legacy `Core*` class prefixes are dropped on import.
4. **Wiring is centralized-explicit per app** (ADR-007 §7 amendment): plain named
   `infrastructure` / `foundation` arrays + inline Tier-1 conditionals in each `app.module.ts`;
   **no `xModules(config)` contribution wrappers**; per-capability fail-fast lives in the
   module/adapter wiring (ADR-007 §9), not a wrapper. Inline in `app.module.ts` now, with an
   extract trigger to a co-located `app.composition.ts` (~20+ imports, or when Tier-2 `forRoot`
   wiring starts crowding the Tier-1 booleans). Each app lists its **own** infra array.
5. **Single-pass import.** Foundation is always-on: no capability flags, and **no speculative
   ports** (no auth-provider port — Supabase Auth is the only provider; ADR-001 trigger governs a
   future SPI).
6. **Admin-org / config data-references:** the entire `deployment` config group is **dropped**
   (`adminOrganizationId` + `systemWalletId`); auth does **not** compute an admin-org flag (it has
   no in-scope reader — the only reader, `epicollect`, is deferred). Each value returns
   DB-resolved with its owning capability (Field Ops / Payments). `is_nxt_grid_member` →
   `is_admin_org_member` is the name to use **when reintroduced**. `NxtSupabaseUser` →
   **`AuthenticatedUser`**. `systemWalletId` → **`bankingSystemWalletId`** when it returns (under
   `capabilities.payments`, not a resurrected top-level group). ADR-007 amendment (Task 1).
7. **Boot model:** a host that wires Foundation/Supabase infra **requires DB connectivity and
   fails fast on missing `SUPABASE_*`**. "Evaluation mode" means *capabilities off + local
   Supabase*, not DB-less. **`worker` includes Supabase infra** in its Foundation. ADR-007
   amendment (Task 1).
8. **Supabase infra:** `SupabaseService` builds the admin client in a **provider** with
   `requireEnv` (fail-fast at boot); **no `export const supabase` singleton**. Per-host env
   validated at each provider's wiring — admin client (`SUPABASE_API_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`) both hosts; `SUPABASE_ANON_KEY` + `SUPABASE_JWT_SECRET` in auth
   (`api` only). The query-type shortcut returns later via a **type-only probe** (no runtime
   client). Cloudflare-5xx handling and `SUPABASE_QUERY_LIMIT` kept as-is.
9. **Logging:** **`nestjs-pino`** in `@nxt/core`, structured JSON to stdout (dev pretty-print),
   `LOG_LEVEL` env (soft default `info`), **config-assembled transports** with Loki/Sentry as
   deferred **Tier-3** integrations (documented `LOKI_URL` / `SENTRY_DSN` slots, Loki-via-stdout
   documented as the free path). `console.*` replaced **only within imported Foundation modules**.
10. **Types:** the **adjusted layer is reintroduced from the get-go** —
    `libs/core/src/types/supabase-types-adjusted.ts` augments the generated `Database` with the
    PostGIS `location_geom` types for `grids` **and** `poles`, exposed at its own subpath
    (`@nxt/core/types/supabase-types-adjusted`). Convention: **`Database` is always imported from
    the adjusted subpath**; only enum/row types come from the generated subpath (optionally
    enforced with a restricted-import lint rule).
11. **Placement principle (ADR-013):** core entities are shared **data**; capability-specific
    **behavior** lives in the owning capability, never bolted onto the core module (no
    conditional-unlock methods, no plugin registry in the baseline). This is why `grids` is a
    partial import (see Task 10) and why the "no-cracks" governance below is mandatory.
12. **i18n / de-brand:** `grids.timezone` default `'Africa/Lagos'` → **`'UTC'`** via **amending
    the 002b init migration** (Task 2). A running **internationalization & de-brand register** is
    created (Task 1) and grows per import. Foundation code-level de-brand is done inline
    (delete dead test code, fix comments, `AuthenticatedUser` rename). `organizations.timezone`
    as a future column is *noted*, not acted on.
13. **Verification:** typecheck + a growing **seed** + a single **keep-or-dismiss test spike**;
    **manual maintainer sign-off** is the standing fallback. Request-handling reads shift to the
    **per-request user client** (admin client only pre-auth / privileged); RLS parity is part of
    the bar. `accounts.findOne` relation-trimming is **decided on the spot** at implementation.

## Scope

| In Foundation (002d) | Deferred / re-homed | Where it goes |
|---|---|---|
| Infra: Supabase client, HTTP, **new pino logging** (config/types already in `@nxt/core`) | `download` | later (ADR-004 §5 amend) |
| `auth` (supabase + api-key strategies + guard) | `routers` | Production Monitoring (ADR-004 §5 amend) |
| `api-keys`, `accounts`, `members` (type-only) | notification-core | first capability that writes notifications |
| `organizations`, `user-admin` (whole) | `websocket` | Metering (first realtime emitter) |
| `grids` (partial — read/CRUD; metering-coupled methods re-homed) | `agents` | Metering/Payments (entity rides identity graph) |
| | `dcus`, `poles` | Metering |

## Non-goals (do not build here)

- Any capability module (production, metering, payments, notifications, field-ops, automation).
- An auth-provider port / pluggable-auth SPI (ADR-001 trigger governs).
- ADR-005 inter-host communication — **prerequisite of authoring 002e**, not resolved here.
- Loki/Sentry transports (Tier-3, deferred — only the config-assembled slots are left open).
- Re-enabling the CI type-drift guard (stays deferred per 002c Task 7).
- A full integration-test harness on spec (only the single scoped spike — Task 8).
- `organizations.timezone` column, `bankingSystemWalletId`, admin-org DB resolution (return with
  their consumers).

## Current state snapshot (2026-07-15 — start of 002d)

- Workspace: Nx 23.0.2, pnpm, Node 24. Projects: `apps/api` (`@nxt/api`), `apps/worker`
  (`@nxt/worker`), `libs/core` (`@nxt/core`). `legacy/` excluded from the graph.
- `@nxt/core` exports: `getConfig/loadConfig/setConfig`, `requireEnv`, `getPackageInfo`,
  `demoModules`, `NxtConfig`; config under `src/config/`; generated types at
  `src/types/supabase-types.ts` (subpath `@nxt/core/types/supabase-types`); temporary `demo`
  capability under `src/modules/demo/`.
- Config schema (`src/config/schema.ts`): `$schemaVersion`, `deployment {adminOrganizationId?,
  systemWalletId?}`, `public {platformName}`, `capabilities {demo?}`, `integrations {}`. **This
  plan removes `deployment` and `demo`.**
- Hosts: `api` serves `GET /health`; `worker` logs a heartbeat. Both `main.ts` `loadConfig()` then
  dynamic-import `AppModule`; both compose `[ ...alwaysOn, ...demoModules(getConfig()) ]`.
- Legacy Foundation source (reference, in `legacy/`): `apps/tiamat/src/modules/{auth, api-keys,
  accounts, agents, organizations, user-admin, grids, ...}` (controllers/services) +
  `libs/core/src/modules/{accounts, api-keys, members, organizations, grids, ...}`
  (TypeORM entities + some services) + `libs/core/src/modules/supabase.module.ts`,
  `logger-module.ts`, `global-http-module.ts` + `libs/helpers/`.

## Import ledger

Authoritative record of legacy Foundation source files and their disposition. **A legacy file is
deleted only when fully superseded.** For entangled files, record the destination **per behavior**
(ADR-013). Keep this current as tasks execute.

| Legacy source | Disposition | Notes |
|---|---|---|
| `libs/core/src/modules/supabase.module.ts` | to import (Task 4) | provider refactor; drop `export const supabase`; type-only-probe forward pattern |
| `libs/core/src/modules/logger-module.ts` (+ dead LokiService) | **superseded — delete** | replaced by pino (Task 4); not ported |
| `libs/core/src/modules/global-http-module.ts` | to import (Task 4) | as-is / minimal |
| `libs/core/src/modules/accounts/**` | to import (Task 6) | rewrite to Supabase; entities dropped |
| `libs/core/src/modules/api-keys/**` | to import (Task 6) | rewrite to Supabase; entities dropped |
| `libs/core/src/modules/members/**` | type-only (Task 6) | empty service — no module; entity dropped |
| `libs/core/src/modules/organizations/**` + `apps/tiamat/.../organizations/**` | to import (Task 9) | move (already Supabase) |
| `apps/tiamat/src/modules/auth/**` | to import (Task 7) | move; `AuthenticatedUser`; drop admin-org flag |
| `apps/tiamat/src/modules/user-admin/**` | to import (Task 9) | whole; delete dead test code |
| `apps/tiamat/src/modules/grids/**` + `libs/core/.../grids/**` | **partial** (Task 10) | grid CRUD/read now; connectivity-stats → **re-home to Metering**; legacy file retained until both halves absorbed |
| `libs/core/src/types/supabase-types-adjusted.ts` | **reintroduced** (Task 3) | grids+poles geom; `@nxt/core/types/supabase-types-adjusted` subpath; legacy file deleted at Task 11 |
| `libs/helpers/src/*.ts` | per-use, file-granular | `git mv` each file at first import (with its `.spec`) |

---

## Task 1 — Decision records & registers (upfront)

- [x] **Status:** Done (2026-07-15)
- **Depends on:** nothing (guides the rest — do first)

Record the decisions before the code so the import executes against them.

1. **Author ADR-013** — "Capability-owned behavior over shared core entities" (data in core,
   behavior in the owning capability; no conditional-unlock methods; no plugin registry in the
   baseline; grids worked example; metering/metering-monitoring seam as the illustrative case).
   Confirm the next free ADR number at write time.
2. **AGENTS.md** — add the ADR-013 row to the ADR index table; add a brief read-if-relevant
   pointer in the Backend/architecture section (**not** an always-applied rule — avoid
   context-bloat). Optionally a `.cursor/rules/*.mdc` with `alwaysApply: false` + a description.
3. **Amend ADR-004 §5** — download/routers out of platform core; notification-core & websocket
   deferred; agents/dcus/poles re-homed; grids partial. Keep the capability map aligned.
4. **Amend ADR-007** — (a) wiring is centralized-explicit per app, superseding decision 7's
   contribution-function mechanism; (b) the `deployment` group is dropped and admin-org is
   resolved DB-side per consumer (closes the "backend consumers" open item); (c) the refined boot
   model (foundation-wired hosts require DB / fail-fast on `SUPABASE_*`; "eval mode" clarified).
5. **Create the internationalization & de-brand register** —
   `docs/plans/002-oss-migration/internationalization-and-debrand-register.md` (migration-wide,
   grows per import). Seed it with: `grids.timezone` default (Task 2), `AuthenticatedUser` rename,
   and the `organizations.timezone` future-candidate note.
6. **Roadmap** (`docs/plans/002-oss-migration.md`) — sub-plan index 002d → In progress; standing
   assumptions: resolve the "module split philosophy" open item by pointing at ADR-013; record
   ADR-005 as an explicit **002e authoring prerequisite**; note the "no-cracks" governance rules.

**Done when:** ADR-013 exists and is indexed; ADR-004 §5 and ADR-007 amendments are in;
the i18n register exists; the roadmap reflects the above.

**Done (2026-07-15):** ADR-013 authored + AGENTS.md ADR-index row; ADR-004 §5 amended (Foundation
narrowed); ADR-007 amended (2026-07-15: `deployment` group dropped, explicit central per-host
wiring, DB-required boot model); `internationalization-and-debrand-register.md` created + seeded;
roadmap updated (002d index → In progress, no-cracks governance, assumption 12 module-split→ADR-013,
assumption 2 ADR-005→002e prerequisite, assumption 9 deployment dropped, Foundation single-pass
note, deviation-recording + related-docs). The optional `alwaysApply:false` cursor rule was **not**
added (ADR-index row deemed sufficient, per "read-if-relevant, no bloat").

---

## Task 2 — Schema: `grids.timezone` default → `UTC`

- [x] **Status:** Done (2026-07-16)
- **Depends on:** Task 1
- **Executor:** maintainer (`supabase/**` under CODEOWNERS)

**Amend the 002b init migration** so `grids.timezone` defaults to `'UTC'` (not `'Africa/Lagos'`).
Regenerate types (`pnpm generate-types:local`) and confirm no unexpected drift. Add a
**schema deviation register** entry (companion to 002b): object `grids.timezone`, change
*parameterize/neutralize default*, rationale *de-Nigeria the OSS baseline*, cutover implication
*default affects new inserts only — existing company grids retain stored values; company keeps its
own default or aligns*. Cross-link the i18n register.

**Done when:** init migration amended; types regenerated clean; deviation + i18n registers updated.

---

## Task 3 — Reintroduce the adjusted types layer

- [x] **Status:** Done (2026-07-16)
- **Depends on:** Task 2

1. Add `libs/core/src/types/supabase-types-adjusted.ts` augmenting the generated `Database` with
   `location_geom` (`{ type: 'Point'; coordinates: number[] }`) for **`grids` and `poles`** (as
   legacy).
2. Add the package subpath export `@nxt/core/types/supabase-types-adjusted` in
   `libs/core/package.json`.
3. Convention: **`Database` imported only from the adjusted subpath**; enum/row types from the
   generated subpath. Optionally add an ESLint `no-restricted-imports` rule enforcing it.

**Done when:** the adjusted `Database` is importable at its subpath; `nx run-many -t typecheck`
green; the import convention is documented (and lint-guarded if adopted).

---

## Task 4 — Infra + explicit composition (Supabase provider, pino logging, demo removal)

- [ ] **Status:** Not started
- **Depends on:** Task 3

The foundational infra task (rule 1). Both hosts boot on real infra.

1. **Supabase infra** in `@nxt/core`: `SupabaseService` builds the admin client in its constructor
   via `requireEnv('SUPABASE_API_URL')` + `requireEnv('SUPABASE_SERVICE_ROLE_KEY')`; **remove the
   `export const supabase` singleton**. Port `handleResponse` / `throwSupabaseError` /
   Cloudflare-5xx handling as-is but route logging through pino. Keep `SUPABASE_QUERY_LIMIT` a
   plain constant. (The query-type-shortcut `lib/supabase.ts` files are in deferred capabilities;
   the **type-only probe** pattern is documented for their return — nothing to build here.)
2. **HTTP infra:** port `global-http-module.ts` (minimal).
3. **Logging** in `@nxt/core`: `nestjs-pino` module — structured JSON to stdout, dev pretty-print
   (gated by `NODE_ENV`/`LOG_PRETTY`), `LOG_LEVEL` env (soft default `info`), transport list
   **assembled from config** with documented (unbuilt) Loki/Sentry Tier-3 slots. Retire
   `logger-module.ts`/`LokiService` (not ported). Wire as the Nest logger in each `main.ts`.
4. **Explicit composition:** replace `demoModules()` in both `app.module.ts` with plain named
   `infrastructure` / `foundation` arrays + inline Tier-1 conditionals (empty capability set for
   now). `api` infra = Logger + Supabase + HTTP; `worker` infra = Logger + Supabase (+ existing
   schedule/heartbeat). **Remove the `demo` capability** (`modules/demo/`, `demoModules` export,
   `demo` from `capabilities` schema) and the `deployment` group from `config/schema.ts` +
   `config.example.json` / `config.default.json`.
5. Update `.env.example` with per-host Supabase + `LOG_LEVEL` documentation.

**Done when:** both hosts boot on default config against a local Supabase; missing `SUPABASE_*`
fails fast with a clear `MISSING …`; logs are structured JSON (pretty in dev); `demo`/`deployment`
are gone; `nx run-many -t lint typecheck build test -p api,worker,core` green.

---

## Task 5 — Seed harness

- [ ] **Status:** Not started
- **Depends on:** Task 3 (schema/types stable)

Establish `supabase/seed.sql` (or a seed script) that grows per import. 002d fixtures: an
organization (including the `PLATFORM_OPERATOR` row), accounts, members, an `api_keys` row, and a
grid — plus a **test auth user with `app_metadata` claims** (account_id, member_type,
organization_id) for auth/e2e. Doubles as the local-dev bootstrap.

**Done when:** a fresh `pnpm supabase start` + seed yields a coherent Foundation dataset and a
usable test user; documented in `docs/deployment/supabase.md` (or the local-dev doc).

---

## Task 6 — `accounts` + `api-keys` (TypeORM → Supabase rewrites)

- [ ] **Status:** Not started
- **Depends on:** Task 4 (+ Task 5 for verification)

Rewrite both services against the Supabase **admin** client (they run pre-auth, during token
validation): `accounts.findOne` (nested identity relations) and
`api-keys.findByKeyAndIsLocked(key, false)` (nested account graph). Drop the TypeORM entities.
Reconcile entity-vs-generated type gaps (enums, nullability); express computed/aliased fields as
explicit mapped/response types, not silent entity props. **`accounts.findOne` relation-trimming is
decided on the spot** (lean to keep what the frontend needs — e.g. wallet — record the call in the
decisions log). `members` is **type-only** (no module).

**Done when:** both compile against generated types; the seeded reads return the expected nested
shapes/values (Task 8 covers automated proof or manual sign-off); no ops TypeORM remains in scope.

---

## Task 7 — `auth`

- [ ] **Status:** Not started
- **Depends on:** Task 6

Move the two Passport strategies + `AuthenticationGuard`. Rename `NxtSupabaseUser` →
**`AuthenticatedUser`**; **drop the admin-org membership flag** (no in-scope reader); keep exposing
raw `organization_id`. `console.*` → pino; de-brand comments. Validate `SUPABASE_ANON_KEY` +
`SUPABASE_JWT_SECRET` via `requireEnv` at auth wiring (`api` only). Restore `enableCors()` + a
global `ValidationPipe` on the `api` bootstrap. Add passport / `jsonwebtoken` deps to `api`.

**Done when:** `api` authenticates a seeded Supabase JWT (bearer) and an `X-API-KEY`; the guard
attaches a populated `AuthenticatedUser`; `worker` requires none of the auth secrets.

---

## Task 8 — Scoped test spike (keep-or-dismiss)

- [ ] **Status:** Not started
- **Depends on:** Tasks 5, 7
- **Executor:** collaborative; **dismiss → maintainer manual sign-off**

A single, self-contained effort — do not muddle across other tasks. Stand up **one** integration
test (`api-keys.findByKeyAndIsLocked` against local Supabase + seed) and **one** e2e auth test (the
`X-API-KEY` guard path). Evaluate: adopt as the pattern others copy, **or** dismiss cleanly and
fall back to maintainer manual sign-off for the remaining modules. If the agent is burning
excessive tokens or getting stuck, dismiss and hand to manual sign-off.

**Done when:** the spike runs green (adopted) *or* is explicitly dismissed with the rationale
recorded and manual sign-off adopted as the standing bar.

---

## Task 9 — `organizations` + `user-admin`

- [ ] **Status:** Not started
- **Depends on:** Task 7

Move `organizations` (already Supabase) and `user-admin` **whole** (members + agents + customers —
the recorded user-admin-specific exception). Delete the dead commented test-user code; de-brand
comments. Shift request-handling reads to the **per-request user client** where the operation acts
as the user (RLS-exercising); admin client only where genuinely privileged. Bring their DTOs.

**Done when:** endpoints compile and behave against the seed (automated per Task 8 outcome, or
manual sign-off); RLS parity confirmed for user-client reads.

---

## Task 10 — `grids` (partial, per ADR-013)

- [ ] **Status:** Not started
- **Depends on:** Task 7

Import the org-scoped grid **read / list / update** (rewritten to Supabase, user-client where
acting as user). **Do not** import the metering-coupled methods (connectivity stats, DCU/meter
orchestration) — per ADR-013 these are **re-homed to Metering**, authored fresh there, not restored
to grids. Retain `legacy/.../grids/grids.service.ts` with a ledger note ("connectivity-stats →
Metering, pending"); delete only when both halves are absorbed.

**Done when:** grids CRUD/read works against the seed; the import ledger records grids as partially
imported with the pending re-home; no `dcus`/`meters` dependency pulled into 002d.

---

## Task 11 — Close-out

- [ ] **Status:** Not started
- **Depends on:** Tasks 1–10

- Delete superseded legacy Foundation files per the import ledger (whole-file, when fully
  superseded).
- Finalize the import ledger, schema deviation register, and i18n register.
- Verify the lint bar green across `api`, `worker`, `core`, and any imported `helpers` files.
- Roadmap: 002d → Completed; 002e next (ADR-005 as its authoring prerequisite).
- Confirm `demo` and the `deployment` config group are fully gone.

**Done when:** the done/exit bar (below) is met and recorded.

---

## Done / exit bar for 002d

- `api` boots via explicit central composition; `worker` boots with logging + Supabase infra; both
  fail-fast on missing `SUPABASE_*`; `demo`/`demoModules` removed.
- Foundation imported on the Supabase client (no ops TypeORM; `CoreTypeOrmModule` gone from scope):
  `auth` (`AuthenticatedUser`, admin-org flag dropped), `api-keys`, `accounts`, `members`
  (type-only), `organizations`, `user-admin` (whole), `grids` (partial). pino logging live;
  `console.*` replaced within imported modules; user-client-by-default in request handlers.
- Adjusted types layer live (grids+poles geom) with uniform `Database` import; `deployment` group
  dropped; `grids.timezone` default `UTC` (init migration amended); types regenerated clean.
- Verification: lint bar green; seed established (fixtures + claimed test user); the test spike run
  (adopted or dismissed → manual sign-off); e2e auth verified; RLS parity checked.
- Legacy Foundation files deleted per ledger (`grids.service.ts` retained with re-home note); all
  three registers updated.
- Records updated: ADR-013 authored + indexed; ADR-004 §5 & ADR-007 amended; roadmap
  assumptions/index; deployment docs; ADR-005 flagged as 002e prerequisite.

## Records to update (checklist)

- [x] ADR-013 authored + AGENTS.md ADR index row (read-if-relevant; cursor rule not needed)
- [x] ADR-004 §5 amended (scope narrowings)
- [x] ADR-007 amended (wiring / deployment-group drop / boot model)
- [x] Roadmap `002-oss-migration.md`: sub-plan index, standing assumptions (module-split → ADR-013,
      ADR-005 timing, no-cracks governance), notes log
- [x] Schema deviation register: `grids.timezone` (#35, Task 2)
- [x] Internationalization & de-brand register (created + seeded)
- [ ] Deployment docs: Supabase required for foundation hosts, Loki-via-stdout, `LOG_LEVEL` (Task 4/5)
- [ ] Import ledger (this file) kept current (ongoing)

## Notes & decisions log

> Append as the plan is executed. Format: `YYYY-MM-DD — [task] — note`

- 2026-07-15 — Plan authored via an extended maintainer interview (see the oss-migration chat).
  All "Decisions baked in" items were resolved collaboratively; this plan is the write-up. Division
  of labor is per task/subtask, decided as we go.
- 2026-07-15 — [Task 1] Done & signed off. Decision records and registers written up front:
  ADR-013, ADR-004 §5 + ADR-007 amendments, AGENTS.md ADR-index row, the
  internationalization & de-brand register, and the roadmap updates (index, no-cracks governance,
  assumptions 2/9/12, single-pass note). Next: Task 2 (`grids.timezone` → UTC — maintainer-owned).
- 2026-07-16 — [Task 3] Done. Reintroduced `supabase-types-adjusted.ts` (grids+poles
  `location_geom`); `@nxt/core/types/supabase-types-adjusted` subpath export; import convention
  documented (`libs/core/README.md` + module JSDoc); ESLint `no-restricted-imports` blocks
  `Database` from generated subpath; golden-path probes in `health.service.ts`. Next: Task 4.
