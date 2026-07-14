# Open-Source Migration — Roadmap

**Decisions:** ADR-004 (architecture), ADR-005 (open — see decision points), ADR-006 (tooling/CI),
ADR-007 (config), ADR-008 (migration strategy), ADR-009 (migration governance)
**Plan number:** 002 (family)
**Created:** 2026-07-08
**Status:** In progress

---

## Reading guide for AI agents

This is the **overview plan** for turning `nxt-backend` into the single-track, self-hostable
open-source suite decided in ADR-004. It is deliberately *not* task-detailed: execution detail
lives in **sub-plans** in `docs/plans/002-oss-migration/`, named `002a`, `002b`, etc. This file
holds what no single sub-plan can: sequencing, dependency edges, standing assumptions, sub-plan
statuses, and the exit condition.

**How to work in this plan family:**

1. Orient here first, then open the sub-plan you are executing. Sub-plans are written to be
   self-contained for a cold agent (same style as plan 001).
2. Execution is collaborative: tasks are reviewed by the maintainer between steps
   (see `AGENTS.md` workflow). Never run ahead of the review cadence.
3. Keep statuses current — in the sub-plan index below *and* in the sub-plan itself.
4. **Division of labor is decided per task — see below.** It is *not* a given that the agent
   does the work.
4. Record every deviation from the original system in the appropriate register or decisions log
   (see "Deviation recording" below). Undocumented divergence is the primary failure mode of
   this migration.
5. Sub-plans marked *just-in-time* are intentionally not yet written. Author them (with the
   maintainer) only when their prerequisites are nearly complete, so they describe reality
   rather than speculation.

### Division of labor (applies to every task in every sub-plan)

Tasks in this plan family describe **what must happen**, not **who does it**. Per task, the
maintainer chooses the mode, anywhere on this spectrum:

- **Maintainer executes** — the maintainer does the work manually; the agent's job is to
  answer questions, explain the plan's intent, sanity-check intermediate results, and record
  outcomes.
- **Agent executes** — the agent does the bulk of the work; the maintainer steers direction,
  keeps an eye on progress, and reviews before anything is considered done.
- Anything in between (pairing, split subtasks, hand-offs mid-task).

**Agent responsibilities that hold in *every* mode:**

- If the mode for the current task hasn't been stated, **ask — do not assume you are the
  executor** and start making changes.
- Never assume the repo matches the plan's snapshot or a task's expected starting state: the
  maintainer may have done work since your last turn. Verify actual state first.
- Bookkeeping is always the agent's job: when the maintainer reports work done manually,
  record it — task checkboxes and statuses, decisions logs, the deviation register, the
  sub-plan index here — exactly as if the agent had done the work itself.
- The review cadence (rule 2) binds regardless of mode.

---

## Goal and exit condition

**Goal:** one public repository that every operator — NXT Grid and external adopters — runs in
production. Operator-specific behavior expressed only via config file + env (ADR-007); no forks.

**Exit condition (ends dual-track, per ADR-008):** the public repo reaches functional parity with
what the company needs → the company cuts over to running the public repo → the private repo is
retired. The window between "adopter runs it" and "company cuts over" is kept deliberately short.

**Deployment consumers, in order of arrival:**

1. **Local development** — everything provable on a laptop (`supabase start` + `nx serve`).
2. **Fresh Supabase platform project** — maintainer-created, proves cloud deploy of the baseline.
3. **The early adopter** — first production user; their priorities steer capability sequence.
4. **NXT Grid company cutover** — last; requires the convergence migration from the schema
   deviation register (see 002b).

---

## Step 0 — repo restructure (shared prologue)

Before either track starts, everything that exists today (`apps/`, `libs/`, `supabase/`, root
configs) moves into a **`legacy/`** folder in **one atomic, rename-only commit** (no content
changes — this keeps git rename detection intact). `docs/` stays at root. The root becomes clear
ground: 002b authors the new baseline in a fresh root `supabase/`; 002c scaffolds the new Nx
workspace around it.

**`legacy/` is a frozen, read-only reference:**

- Not built, not installed, not in CI: excluded from pnpm workspace globs, all tsconfigs, and
  every Nx/CI target — so nothing in the new workspace *can* depend on it (pnpm strict linking
  and TS project references make this physical, not conventional).
- Gets a `legacy/README.md` declaring its status.
- **Never edited — only deleted from.** A legacy file is removed only when *fully* superseded
  in the new workspace. `legacy/` shrinking to empty is part of the exit condition.
- If legacy behavior must be observed live, use the private company repo — `legacy/` never boots.

Execution detail is **sub-plan 002a** — it blocks both tracks and is executed first.

## Tracks and dependency structure

After Step 0, the groundwork is **two parallel tracks with one interlock point**, followed by the
dependency-constrained capability import (ADR-008 Phase 3/4).

```
Step 0 (002a) ─┬─ Track A: Database baseline (002b) ──────────────┐
               │                                                   ├─→ [interlock] ─→ Capability imports (002d…)
               └─ Track B: Scaffold + pipeline + config (002c) ───┘                        │
                                                                                           ▼
                                                                            Parity verification + cutover
```

- **Track A (002b)** needs only the Supabase CLI + local Postgres. It can start immediately
  after Step 0 and has no dependency on the new workspace.
- **Track B (002c)** proves the golden path (`migration up → gen-types → typecheck → build →
  image → deploy`) per ADR-006/ADR-008 Phase 1, and establishes the ADR-007 config skeleton.
  Until Track A delivers, the golden-path proof may use a minimal hello-world migration.
- **Interlock:** the baseline migrations from Track A become the scaffold's canonical
  `supabase/` content. **Adopted in 002c Tasks 4–5** (002b finished first). **Interlock reached
  2026-07-14** (002c Task 8 clean-clone sign-off). Type-drift CI guard deferred until
  post-migration (002c Task 7).

**002b interlock deliverables (Track A complete, 2026-07-13):** see
`002b-database-baseline.md` Task 10 handoff table — init migration at root `supabase/`, PG17,
CLI pin `2.109.1`, gen-types invocation (`--schema public` only), deviation register, deployment
doc. **Adopted in 002c Tasks 4–5; interlock reached 2026-07-14** (Task 8 sign-off).

**Hard edges for capability imports (non-negotiable, ADR-008 Phase 3):**

- Platform core before any capability.
- Payments after Metering (soft pairing, ADR-004 decision 6).

Within those edges, sequence is a priority choice steered by the early adopter.

## Capability import sequence (current best knowledge)

Two passes per module (ADR-008): (a) move it in working, behavior-preserving; (b) introduce the
port seam + capability flag. Each capability registers its own three-tier config into the 002c
skeleton as it lands (ADR-008 Phase 4). Capability numbering per ADR-004 decision 5.

**Import mechanics (whole vs partial):**

- **Whole-module moves** are `git mv legacy/... → ...` with adaptation in a *separate follow-up
  commit* (move-then-modify keeps git rename detection and `git log --follow` working).
- **Partial imports** are expected: badly entangled legacy modules may be imported piecemeal
  (some methods now, the rest later). The new file starts fresh in git history; the legacy
  source file stays untouched in `legacy/` until fully superseded, then is deleted whole.
- Each capability sub-plan maintains an **import ledger**: a table of the legacy source files in
  its scope, each marked *moved verbatim* / *partially imported (listing what remains)* /
  *fully superseded → deleted*. The ledger — not git history — is the authoritative record of
  what has been re-homed, and guards against two capabilities unknowingly importing duplicate
  copies of shared entangled code.

| Order | Import | Driver |
|---|---|---|
| 1 | Platform core | Hard edge — everything depends on it |
| 2 | (1) Energy Production Monitoring | Adopter priority; clean island (depends only on core); pattern-prover. Includes the TimescaleDB estate (see assumptions) |
| 3+ | (2) Metering, (3) Payments, (4) Notification channels, (5) Field Ops, (6) Automation | Sequenced just-in-time per adopter priority, respecting the hard edges. Metering is currently *not* an adopter priority |

## Sub-plan index

Sub-plans live in `docs/plans/002-oss-migration/`. Keep this table current.

| ID | Title | Scope | Status |
|---|---|---|---|
| 002a | Repo restructure (Step 0) | Create `oss-migration` branch; atomic rename-only move to `legacy/`, freeze notice, verification | Completed |
| 002b | Database baseline | Inventory, four-bucket classification, canonical init migration, A/B diff verification (old chain from `legacy/supabase/migrations`), deviation register, staged rollout (local → fresh Supabase project → adopter) | **Completed** (2026-07-13) |
| 002c | Scaffold, pipeline & config skeleton | Fresh Nx 23 workspace (ADR-006), CI with affected + type-drift guard, Dockerfile, DO deploy baseline, ADR-007 config loader/schema skeleton, hooks reintroduction | **In progress** — Tasks 1–9 complete (2026-07-14); Tasks 10–11 remain |
| 002d | Platform core import | Move platform-core modules into the new workspace (two passes) | Just-in-time — not yet authored |
| 002e | Energy Production Monitoring import | Capability (1), incl. TimescaleDB estate; **exclude device registry** (register #12 — see assumption #10) | Just-in-time — not yet authored |
| 002f… | Remaining capability imports | (2) Metering, (3) Payments, (4) Notifications, (5) Field Ops, (6) Automation — one sub-plan each; IDs assigned when authored | Just-in-time — not yet authored |
| (last) | Parity verification & company cutover | Parity checklist, company DB convergence migration (from deviation register), cutover, private-repo retirement. Strategy-level decisions (host flip mechanics, rollback stance, maintenance window) recorded early in **ADR-012** — reconcile with it when authoring | Just-in-time — not yet authored |

## Standing assumptions and open decision points

| # | Item | Standing position | Resolves when |
|---|---|---|---|
| 1 | **Device-messaging (plan 001 / ADR-010)** | Runs as a parallel effort; this migration treats device-messaging as **arriving as an external service**. The Metering import sub-plan depends on plan 001 being (near) complete | Checked when the Metering sub-plan is authored |
| 2 | **ADR-005 inter-host communication** | Deliberately open. Groundwork (002a–002c) does not need it; much of the current HTTP mesh collapses into in-process calls in the modular monolith | **Decide before the `worker` host receives its first real capability** (i.e. during/before the Production Monitoring import) |
| 3 | **TimescaleDB schema** | Out of the 002b baseline (Supabase primary DB only). Belongs to the Production Monitoring capability import, where its consumers live | 002e authoring |
| 4 | **Production schema = migrations** | Production has had no schema changes outside `supabase/migrations`. Certified by read-only drift check at 002b Task 1 (2026-07-08) | Done (002b Task 1) |
| 5 | **Adopter requirements surface during execution** | Outside requirements (renames, omissions, additions) are discovered *while executing* sub-plans, not gathered up-front — and always recorded (see below) | Continuous |
| 6 | **Branch strategy** | The migration lives on the long-running **`oss-migration`** branch; `main` keeps the original tree (incl. original README) untouched. No external automation watches this repo (production builds from the private repo). Documentation rewrites (root README, AGENTS.md commands) are deferred to the later phases | When/how the branch lands on `main` — decided in a later phase |
| 7 | **Git hooks (husky) suspended** | Hooks are suspended from Step 0 onward to avoid friction during groundwork. Automatic lint/typecheck on commit is reintroduced as a 002c task, activated once the new workspace's lint/typecheck targets are stable | 002c execution |
| 8 | **Company cutover strategy (ADR-012)** | Decided ahead of the just-in-time sub-plan, since they're durable and unlikely to change: schema convergence splits into "anytime" (additive/dead-drop) vs. "flip-atomic" (renames) changes; `api` can blue/green but `worker` needs a hard stop-then-start; RLS parity gets an explicit regression pass; hard point-of-no-return past the flip-atomic migration (PITR checkpoint immediately before); a short maintenance window is acceptable; Geo FastAPI is out of scope | The "Parity verification & company cutover" sub-plan is authored — reconcile its runbook with ADR-012, which it supersedes on execution detail |
| 9 | **DB-native platform operator org** (register #22) | Admin organization row is DB-native (`PLATFORM_OPERATOR`); **backend resolved (002c Task 3, 2026-07-14)** — `getConfig().deployment.adminOrganizationId` stays a plain configured value (not DB-queried), with a deferred warn-only drift check against the DB row. **Frontend apps' resolution still not decided** | Frontend delivery — **ADR-007** Amendment "Open / deferred"; revisit alongside decision 11's frontend config delivery |
| 10 | **Device registry dropped from baseline** (register #12) | `devices` / `device_types` / `device_logs` excluded from OSS schema; **ADR-004** §5 amended (2026-07-13) — `device-data-sink` removed from (1) | **002e** authoring (import must not resurrect device registry) |
| 11 | **NXT Grid production Postgres 15→17** | OSS baseline targets PG17; NXT Grid production is still PG15 — independent Supabase platform-upgrade project (extensions, role passwords, …), not 002b/002c | Before company cutover parity — **ADR-012** trigger; prerequisites in cutover sub-plan when authored |

## Deviation recording

Two levels, both mandatory:

1. **Schema deviation register** (companion to 002b, in the sub-plan folder): one entry per
   deviation from the original schema — object, change (drop / exclude / parameterize / rename /
   other), rationale, and **cutover implication** (what the company DB needs to converge).
   This register *is* the spec for the company convergence migration at cutover.
2. **Per-sub-plan decisions log**: every sub-plan ends with a "Notes & decisions log" section
   (as in plan 001) recording task-level deviations and choices made during execution.

**Rename policy:** renames are allowed but each one is a loan against later phases — imported
module code must be adjusted during its import pass, and the company DB needs a data migration at
cutover. Weigh each rename individually; record all of them.

## Related documents

- **ADR-004** — target architecture; capability map; three-tier flags.
- **ADR-006** — tooling/CI decisions executed by 002c.
- **ADR-007** — config mechanism executed by 002c (skeleton) and each capability import (flags).
- **ADR-008** — the four-phase strategy this roadmap operationalizes.
- **ADR-009** — migration governance executed across 002b (baseline) and 002c (CI lane, CODEOWNERS).
- **ADR-012** — company cutover strategy; strategy-level decisions for the last, not-yet-authored
  sub-plan (see assumption 8).
- **Plan 001** — device-messaging service extraction (parallel effort; see assumption 1).

---

## Notes & decisions log

> Append here as the roadmap evolves. Format: `YYYY-MM-DD — note`

- 2026-07-08 — Roadmap created. Structure decided with maintainer: overview file +
  `002x` sub-plans in `docs/plans/002-oss-migration/`; database baseline runs as a
  parallel first track; groundwork sub-plans authored in full now, capability sub-plans
  just-in-time.
- 2026-07-08 — Step 0 (`legacy/` folder via atomic rename-only commit) decided with maintainer.
  Legacy is frozen reference: never edited, only deleted from when fully superseded. Partial
  imports of entangled modules are expected; capability sub-plans carry an import ledger as the
  authoritative re-homing record.
- 2026-07-08 — Step 0 promoted to its own sub-plan **002a** (it blocks both tracks, so its
  detail cannot live in the later scaffold plan). Letters shifted: database baseline → 002b,
  scaffold/pipeline/config → 002c, capability imports start at 002d.
- 2026-07-08 — Maintainer confirmations folded in: no external automation watches this repo
  (auto-apply pre-flight dropped from 002a); migration executes on the `oss-migration` branch
  with `main` frozen; docs deferred; husky suspended until 002c (assumptions 6 and 7).
- 2026-07-08 — "Division of labor" section added to the reading guide (mirrored as an
  execution-model note in each sub-plan header): per task, the maintainer chooses who
  executes; the agent must ask when unstated, verify actual repo state rather than assume,
  and always keep the bookkeeping regardless of who did the work.
- 2026-07-10 — Discussed company cutover strategy ahead of authoring the last sub-plan (its
  prerequisites are far from complete). Surfaced runtime facts not considered in ADR-008: the 4
  legacy apps collapse to 2 hosts (`api`/`worker`, ADR-004/005), and the database is the primary
  integration point for 5 frontends + Grafana + Make.com, not just the backend. Recorded as
  **ADR-012**: schema convergence splits into anytime-safe vs. flip-atomic changes; `api`/`worker`
  have different flip mechanics; RLS parity gets an explicit regression pass; hard point-of-no-return
  past the flip-atomic migration (PITR checkpoint before); short maintenance window accepted; Geo
  FastAPI out of scope. The ADR's illustrative cutover sequence is explicitly non-binding — the
  authoritative runbook remains the just-in-time sub-plan, to reconcile with ADR-012 when authored.
  New standing assumption 8 added; sub-plan index and related-documents updated to point to it.
