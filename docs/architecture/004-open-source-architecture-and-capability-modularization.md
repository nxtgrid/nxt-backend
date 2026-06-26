# ADR-004: Open-Source Architecture — Monorepo, Capability Modularization & Per-Deployment Configuration

**Date:** 2026-06-26
**Status:** Accepted (initial high-level direction; sub-decisions deferred to follow-up ADRs)

---

## Context

`nxt-backend` is transitioning from highly-coupled, company-specific code into a generic,
self-hostable open-source suite that both NXT Grid and other organizations can run directly.
Today there are two repositories (a private operational repo and this public one) only because
the code was not yet ready to open-source.

The goal state is **single-track**: one public repository that every operator (including NXT Grid)
runs in production, with all operator-specific behavior expressed through a **config file + environment
variables**, never through forks.

This ADR records the high-level architecture decisions required to make that goal manageable and the
resulting suite robust. It deliberately stops at the architectural seams; mechanism-level and
operational decisions are deferred to the follow-up ADRs listed at the end.

## Decisions

### 1. Single-track open source
The public repository is the product. NXT Grid runs the same code as everyone else.
Operator-specific behavior is handled via configuration and optional/pluggable modules — not a
private fork. The current dual-repo state is transitional only.

### 2. One monorepo
Apps, libs, and `supabase/` (migrations, generated types, functions) stay co-located in a single repo.
Rationale: the generated DB types are imported by 120+ files across every app and `core`; co-location
lets "migration → regenerate types → typecheck every consumer" happen atomically in one PR/CI run.
Splitting would impose a perpetual cross-repo version-lockstep tax on a small team. Splitting is
reserved for artifacts with a genuinely independent release cadence.

### 3. Migrations are the canonical schema; types are a derived, checked-in artifact
- Bootstrap flow: `supabase start` → apply migrations → (optional) seed → `gen-types-local`.
- `supabase-types.ts` remains committed, but its provenance changes from "remote production DB" to
  "migrations at this git ref".
- A CI job regenerates types from a clean migrated DB and fails on any diff (`git diff --exit-code`),
  making types provably a function of the migrations in the same ref.
- `db pull` is demoted from authoring tool to transitional reconciliation + drift detection only.
- Type generation is scoped to owned schemas (`public` + our own), not Supabase-managed schemas.
- The Supabase CLI / type generator version is pinned.
- Company-specific schema objects (e.g. `grafana_readonly`, `make_readonly` roles) are parameterized
  or moved out of base migrations.

### 4. Modular monolith with capability-based, ports-and-adapters architecture
A lean, always-on **platform core** plus **capability modules** (vertical/functional domains) wired
onto **thin runtime hosts** (horizontal/operational). Capabilities expose **ports**; concrete vendor
**adapters** implement them and are selected by config. (Aligned with ADR-001's adapter-config direction.)

### 5. Capability map (derived from current modules)
- **Platform core (always on):** auth, api-keys, organizations, members, accounts, agents, grids,
  poles, dcus, routers, db/supabase, logging, websocket, download.
- **(1) Energy Production Monitoring:** mppts + mppt/grid snapshots, victron, solcast & forecasts,
  grid-diagnostics/digital-twin, device-data-sink, zerotier.
- **(2) Smart Metering & Distribution:** meters, meter-interactions/installs/commissionings,
  hardware imports/installs, connections, customers, directives & batches,
  device-messages, calin adapter, chirpstack/LoRaWAN, ussd-sessions.
- **(3) Payments & Revenue:** orders, wallets, payouts, transactions, spending, loans, banks,
  flutterwave adapter, revenue/lost-revenue.
- **(4) Notification channels:** notification core is platform; channels (sendgrid, africastalking,
  telegram, make, flow-xo) are optional adapters.
- **(5) Field Operations:** epicollect, issues, notes, jira, pd-flows/actions/hero.
- **(6) Automation:** autopilot, lifeline (depends on (2) and/or (3)).

The primary independence boundary is **(1) Production vs (2)+(3) Metering/Payments**, over the shared
platform core. Production is the clean island (depends only on platform core).

### 6. Three-tier feature-flag model
- **Tier 1 — Capability** on/off.
- **Tier 2 — Provider** per capability port (adapter selection, or "none-yet").
- **Tier 3 — Integration** optional augmentations (Make.com, FlowXO, JIRA, Telegram, Sentry/Loki).

Honesty rules: **required ports** with no adapter → capability runs in a safe/manual mode (does not
crash); **optional integrations** absent → silently skipped. Inter-capability links (e.g. payments and
metering) are **soft pairings with graceful degradation**, not hard boot-time requirements.

### 7. Configuration scope is per-deployment
All flags (capability, provider selection, integration) are **static per-deployment configuration**
(config file + env), resolved at boot. Full per-tenant capability *entitlements* are explicitly out of
scope. The multi-organization data model is retained as an internal grouping/multi-site construct, not as
an entitlement axis. Per-organization provider overrides (e.g. ADR-003 per-org Flutterwave credentials)
are a niche secondary feature for specific deployments, not part of the baseline OSS model.

### 8. Runtime hosts & decomposition principle
- Default hosts: **`api`** (tiamat + folded-in talos) and **`worker`** (background/collector domains).
- Worker composition is **config-driven along capability seams** (a host loads the enabled capabilities'
  contributions); operators may run one combined worker or split workers as needed.
- `talos` is deprecated and folded into the metering capability.
- `device-messages` stays an in-process module behind a port boundary, extractable to its own process
  only when ADR-001's triggers fire.
- Principle: **a separate deployable is justified only by a divergent runtime profile** (independent
  scaling, failure isolation, incompatible execution model) — never by code tidiness. Capability flags
  are the on/off axis; hosts are the where-it-runs axis; the two are orthogonal.

### 9. Schema stays whole
With one canonical migration set, disabling a capability gates **code/runtime, not tables**. Unused
tables remain inert. No modular/per-capability migrations.

## Consequences

### Positive
- One artifact, one schema, one type-generation path — atomic, reviewable changes.
- Operators self-host with a single config file + env; lean default footprint (`api` + `worker` + DBs).
- Company-specific code becomes generic via adapters + flags rather than forks (single-track viable).
- Capability boundaries map to the physical reality of a mini-grid (generation vs consumption).
- Disabled capabilities are never instantiated (smaller attack surface, fail-fast at boot).

### Negative / Risks
- Requires a disciplined migration from `db pull` dumps to authored forward migrations.
- The lean-core refactor is a transitional effort: each candidate capability/adapter must be extracted
  behind a port, which touches many modules.
- A single combined worker shares one Node event loop; heavy aggregation must be pushed to the DB
  (TimescaleDB continuous aggregates) or split to a dedicated worker under load.
- Existing dual-ORM usage (legacy TypeORM + Supabase client on the primary DB) complicates module
  extraction and must be paid down alongside.

## Out of Scope / Deferred to Follow-up ADRs
- **ADR-005 — Inter-host communication:** shared-DB vs HTTP mesh vs internal event bus (today both a
  shared DB and a bidirectional HTTP mesh are in use).
- **ADR-006 — Monorepo tooling & CI/CD:** Nx suitability / fresh setup, affected-only builds, remote
  caching, per-host build & deploy, replacing the DigitalOcean-coupled stub workflow.
- **ADR-007 — Configuration & wiring mechanism:** config file format, conditional NestJS dynamic-module
  loading per capability, boot-time validation of flags/providers.
- **Per-organization provider overrides** (generalizing ADR-003) as an optional payments feature.
- **Dual-ORM consolidation** (TypeORM → Supabase client) as it interacts with capability extraction.

## Triggers (revisit this ADR when)
- A capability needs to differ per organization within one deployment (would reopen Decision 7).
- A second real adapter appears for a port (validates/forces the Tier-2 abstraction; cf. ADR-001).
- A capability's runtime profile diverges enough to warrant its own deployable (cf. Decision 8).
