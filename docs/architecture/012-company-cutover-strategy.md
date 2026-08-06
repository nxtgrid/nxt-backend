# ADR-012: Company Cutover Strategy

**Date:** 2026-07-10
**Status:** Accepted (strategy-level); detailed runbook deferred to the just-in-time "Parity
verification & company cutover" sub-plan (see `docs/plans/002-oss-migration.md`)

---

## Context

ADR-008 sets the exit condition for the OSS migration tersely: the public repo reaches functional
parity → the company cuts over to running it → the private repo is retired, window kept
deliberately short. It does not decide *how* that flip is executed. ADR-009 governs how schema
migrations get applied (explicit, operator-controlled) but likewise does not cover the broader
system flip — backend, frontends, and third-party integrations together.

A sanity-check pass (2026-07-10, alongside the 002b database-baseline wrap-up) surfaced facts about
the actual runtime shape that materially change what a safe cutover looks like, and that were not
available/considered when ADR-008 was authored:

- **Host consolidation:** the 4 legacy apps (`tiamat`, `talos`, `loch`, `yeti`) collapse into **2**
  runtime hosts per ADR-004/ADR-005 — `api` (`tiamat` + folded-in `talos`) and `worker`
  (background/collector domains, `loch` + `yeti`). Cutover is a 2-deployable flip, not a 4-app one.
- **The database is the primary integration mechanism** (ADR-005 Accepted: shared DBs carry state;
  residual HTTP is exceptional and prefer worker→`api`). The legacy bidirectional HTTP mesh is
  retired as a pattern and shrinks further as hosts merge.
  Beyond the backend, **all 5 frontends** (each with a single `VITE_API_URL` *and* direct
  `VITE_SUPABASE_URL`/anon-key access, bypassing the API), **Grafana** (`grafana_readonly` role),
  and **Make.com** (`make_readonly` role + grid webhook triggers) all depend directly on the same
  Postgres instance. None of these non-backend consumers were analyzed against the schema deviation
  register's rename/drop entries before now.
- Company cutover (roadmap "Deployment consumers" step 4) is the **only** step in the OSS migration
  that touches the real production database — steps 1–3 (local, fresh Supabase project, early
  adopter) run against isolated databases with no production risk.

## Decision

### 1. Split schema convergence into "anytime" and "flip-atomic" buckets
A single production database cannot run two divergent schemas at once, so the schema deviation
register's entries are triaged by cutover risk, not applied as one big-bang migration on cutover
day:

- **Anytime, ahead of cutover:** additive/hardening changes (new indexes, function volatility,
  `GRANT`s, `ON DELETE` hardening, …) and drops of objects re-verified dead against the *live*
  production codebase (not just `legacy/`) — applied to production independent of, and well before,
  backend cutover.
- **Flip-atomic only:** renames/type-changes still referenced by name by the currently-running old
  code. These are the only changes that must happen in lockstep with stopping the old backend and
  starting the new one. Example: `meter_interaction_type_enum` value `TOP_UP` → `TOP_UP_KWH`
  (schema deviation register #36) — the OSS baseline already uses `TOP_UP_KWH`; company production
  still emits/stores `TOP_UP` until the flip-atomic migration and new backend deploy land together.

This minimizes what has to happen inside the actual cutover window to the smallest possible set.

### 2. `api` and `worker` have different flip mechanics
- **`api`** (HTTP-facing) can be **blue/green**: old and new may run briefly in parallel; traffic
  flips atomically via load balancer / the shared `VITE_API_URL` config point.
- **`worker`** (background/collector — queue consumers, cron) must be a **hard stop-then-start**:
  running old and new simultaneously against the same queue or schedule risks double-processing.
  There is no dual-run window for `worker`.

### 3. Non-backend consumers are in scope for the rename/drop audit
Any register entry that renames or drops something touched directly by a frontend's direct Supabase
access, a Grafana dashboard/query, or a Make.com scenario must have its replacement staged and ready
to activate in the same cutover window — not discovered or built under pressure during the window
itself.

### 4. RLS parity is a named, explicit verification requirement
Given the admin-organization redesign (schema deviation register #22) and the RLS invocation-pattern
rewrite (register #32), cutover requires an explicit per-role regression pass against a production
clone before go-live. The "same boolean result" reasoning recorded in the register at design time is
necessary but not sufficient — it must be verified against real data and real roles before the flip.

### 5. Hard point of no return
No rollback path is designed past the flip-atomic migration step. A PITR/backup checkpoint is taken
immediately before it runs; past that point, forward-fix is the only path. This makes explicit (and
binding) the consequence of ADR-009's existing "backup / PITR checkpoint before destructive changes"
safety rail, rather than leaving it implied.

### 6. A short maintenance window is acceptable
NXT Grid has confirmed a brief (minutes), scheduled maintenance window is an acceptable cost for the
cutover. This removes the need to design a fully zero-downtime flip and is the main simplifying
assumption behind decisions 1–2.

### 7. Geo FastAPI is out of scope
The Python Geo FastAPI service (referenced by frontends via `VITE_GEO_API_URL`) is confirmed
unaffected by this migration and needs no coordination at cutover.

### Illustrative sequence (non-binding)

Recorded for continuity — this is **not** a committed plan. The authoritative runbook is the
just-in-time "Parity verification & company cutover" sub-plan (roadmap sub-plan index, last row),
authored once capability imports are nearly complete, per the roadmap's own rule that just-in-time
sub-plans describe reality rather than speculation.

0. Confirm parity prerequisites: every capability NXT Grid runs today has completed its two-pass
   import (ADR-008 Phase 3), respecting the hard edges; plan 001 (device-messaging extraction) at
   the maturity the Metering import needs (roadmap standing assumption 1).
1. Apply every "anytime" convergence change (decision 1) to production ahead of time.
2. Audit remaining flip-atomic renames against every direct consumer (decision 3); pre-stage
   replacement dashboards/frontend changes.
3. Rehearse the flip-atomic migration plus the new `api`/`worker` against a production clone
   (Supabase branch / PITR snapshot), including the RLS regression pass (decision 4).
4. Execute the maintenance window: freeze deploys → stop old writers (`worker` hard-stop; `api`
   optionally blue/green) → apply the flip-atomic migration (PITR checkpoint immediately before,
   decision 5) → deploy new `api`/`worker` against the same production DB → flip `VITE_API_URL`
   (one point, covers all 5 frontends) → activate pre-staged Grafana/Make.com updates → smoke test
   → resume traffic.
5. Post-cutover: bake period with elevated monitoring, then decommission old infra, retire the
   private repo (ADR-008 exit condition), close out the roadmap. (ADR-005 inter-host policy was
   locked 2026-07-17 — flip coordination stays DB-primary with residual HTTP under that ADR.)

## Consequences

### Positive
- Cutover-day risk is minimized by front-loading everything that doesn't require coordination.
- The `api`/`worker` flip-mechanics asymmetry is decided ahead of time instead of discovered
  mid-execution.
- Rollback expectations are explicit and backed by a concrete safety rail (PITR checkpoint), not
  assumed.
- Frontends, Grafana, and Make.com are treated as first-class schema consumers, not an afterthought
  to backend-only analysis.

### Negative / Risks
- The hard point of no return means a bug discovered shortly after cutover must be forward-fixed
  under time pressure, not rolled back.
- The illustrative sequence is not yet validated against real capability-import outcomes and will
  need reconciling once the just-in-time sub-plan is authored.
- Requires disciplined use of the schema deviation register's "cutover implication" field to keep
  the anytime/flip-atomic triage accurate as more entries are added over the life of the migration.

## Rejected Alternatives

- **Zero-downtime flip (no maintenance window).** Rejected — the database-as-integration-bus
  constraint plus `worker`'s hard-stop requirement would make a fully zero-downtime flip materially
  more complex (dual-schema compatibility shims, consumer-group coordination) for a cost NXT Grid
  has confirmed it doesn't need to pay (decision 6).
- **New production database + full data migration at cutover**, instead of converging the existing
  production database in place. Rejected — ADR-008 already commits to in-place convergence ("company
  DB is temporarily a superset"); re-deciding this would be a much larger, unnecessary undertaking.

## Triggers (revisit when)

- The just-in-time "Parity verification & company cutover" sub-plan is authored — reconcile this
  ADR's illustrative sequence with it; the sub-plan supersedes it where they conflict.
- ADR-005 was Accepted (2026-07-17) — flip coordination remains DB-primary; residual HTTP follows
  that ADR (prefer worker→`api`; no mandatory broker). Revisit only if a recorded exception
  changes cutover sequencing.
- The maintenance-window tolerance changes (e.g., a new integration is added that cannot tolerate
  any downtime), invalidating decision 6.
- **NXT Grid production Postgres major-version lag** — OSS baseline targets **Postgres 17** (002b
  complete); company production is still on **PG15** (2026-07-10). A separate Supabase
  platform-upgrade project must complete before cutover can assume PG17 parity (extension set,
  deprecated extensions, custom-role password re-hash if any). Parent roadmap assumption **#11**;
  not 002b/002c scope.

## Related

- **ADR-004** — target architecture; the `api`/`worker` host consolidation this ADR's flip mechanics
  depend on.
- **ADR-005** — inter-host communication (Accepted); shared DBs + residual HTTP policy for
  `api`/`worker` during and after cutover.
- **ADR-008** — migration strategy; the exit condition this ADR operationalizes.
- **ADR-009** — migration deployment & governance; the safety rails (PITR, forward-only) this ADR
  builds on.
- **`docs/plans/002-oss-migration.md`** — roadmap; sub-plan index entry for the eventual detailed
  runbook.
