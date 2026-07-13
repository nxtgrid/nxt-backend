# 002b — Database Baseline

**Parent plan:** `docs/plans/002-oss-migration.md` (read it first)
**Decisions:** ADR-004 (decision 3: migrations canonical, types derived; decision 9: schema
stays whole), ADR-008 (Phase 2), ADR-009 (governance)
**Created:** 2026-07-08
**Status:** Not started
**Depends on:** 002a (repo restructure) complete — the old chain must live at
`legacy/supabase/migrations` and the root must be clear.
**Execution model:** collaborative — the maintainer may execute tasks manually with the agent
advising, or the agent may execute under maintainer review. Ask which mode applies before
starting a task; see "Division of labor" in the parent plan. (Existing per-task `Executor:`
notes mark where maintainer credentials/access are *required*; everywhere else the mode is
chosen per task.)

---

## Purpose

Produce the **canonical init migration**: a single, clean, authored migration representing the
OSS baseline schema — the current live schema minus dead and deprecated objects, with
company-specific infrastructure parameterized — verified equivalent to the old chain modulo an
explicitly recorded set of deviations. This is Track A of the roadmap; it runs independently of
the scaffold (Track B, 002c) and joins it at the interlock (types + CI drift guard).

**Companion artifacts (in this folder):**

- `002b-schema-inventory.md` — working artifact: every schema object, classified (created in
  Task 2/3a).
- `002b-schema-column-adjustments.md` — working artifact: every column on keep tables/views,
  with keep/drop/rename action (**Task 3b** — complete).
- `002b-schema-programmability-review.md` — working artifact: enum values, functions, triggers
  on keep objects (**Task 3c**).
- `002b-schema-performance-audit.md` — working artifact: indexes, function volatility, RLS
  invocation patterns, trigger/view design on keep objects (**Task 3d**, stub created; not started).
- `002b-schema-deviation-register.md` — long-lived register of every deviation from the
  original schema. **This register later becomes the spec for the company convergence
  migration at cutover.** Created up-front with candidate entries (see file).

## Current state snapshot (2026-07-08 — verify before executing)

- **Old chain:** `legacy/supabase/migrations/` (after 002a), 19 files spanning
  `20251028091645` → `20260428131001`. The first file (`…_remote_schema.sql`, ~4,840 lines,
  57 `CREATE TABLE`s) is a `db pull` dump, and several later files are also dump-style
  `remote_schema` reconciliations — this chain was *pulled*, not authored (the provenance
  ADR-004 decision 3 retires).
- **Company-specific infra:** `grafana_readonly` / `make_readonly` roles appear in the first
  migration (parameterize bucket, per ADR-004/008).
- **Known deprecated:** `directives` / `lorawan-directives` tables + their enums, superseded by
  `meter-interactions`; historical `orders` rows still reference them (exclude bucket, ADR-008).
- **Known dead:** tables behind the `一`-prefixed modules. Note: those modules still exist in
  the tree (`legacy/apps/tiamat/src/modules/一demo`, `一directive-watchdog-sessions`,
  `一meter-credit-transfers`) — treat them as in-tree markers of dead schema, not as proof the
  schema is gone (drop bucket).
- **Type generation (legacy pipeline):** `gen-types-local` → `supabase gen types typescript
  --local` → `gen-better-types` → `better-supabase-types` →
  `libs/core/src/types/supabase-types.ts`, plus `.scripts/fix-supabase-json-type.js`. Supabase
  CLI is a devDependency at `^2.54.10` (ADR-006 requires an exact pin — interim rule below).
- **Production project:** ref `axenumkepgnwfmdogkqq` (from the legacy `gen-types-remote`
  script). Production schema is assumed identical to the old chain (roadmap assumption 4 —
  certified in Task 1).

## Non-goals

- **TimescaleDB** — belongs to the Production Monitoring capability import (roadmap assumption 3).
- **RLS policy redesign** — policies are carried over as-is (or excluded with their tables);
  rethinking authorization is not baseline work.
- **Migration-apply governance workflow, `squawk` linter, `db diff` PR comment** — deferred
  (ADR-006/009); the CI type-drift guard itself is 002c work.
- **Any data migration** — this plan ships schema only. Seed data is a bootstrap convenience
  (Task 8), not a migration.

## Interim tooling rule (until 002c pins things properly)

There is no root `package.json` yet. Until 002c lands, invoke the Supabase CLI at a **fixed
version chosen at Task 4 and recorded in the decisions log** (e.g. `npx supabase@2.54.10 …`),
never `supabase@latest`. The same version must later go into the 002c workspace pin. Keep the
Postgres major version in the new root `config.toml` **identical** to the legacy one, so A/B
dumps compare apples to apples.

---

## Task 1 — Certify "production = migrations" (drift check)

- [x] **Status:** Complete
- **Depends on:** 002a complete
- **Executor:** maintainer (requires production credentials)

From the legacy project dir (`legacy/supabase/` is a valid CLI workdir — `config.toml` moved
with it):

```bash
cd legacy
npx supabase@<pinned> link --project-ref axenumkepgnwfmdogkqq
npx supabase@<pinned> db diff --linked --schema public
```

Expected output: **no changes**. This is read-only and certifies roadmap assumption 4 — that
nothing (dashboard edits, hotfixes) ever changed production outside the migration chain.

**If drift is found:** stop; record the drift verbatim in the decisions log; decide with the
maintainer per object whether it joins the old-chain reference (a reconciliation migration in
`legacy/`… which violates the freeze — more likely: note it as an *additional* known deviation
input to Task 3) before proceeding.

**Done when:** the diff result (empty or itemized) is recorded in the decisions log below.

---

## Task 2 — Build the reference DB and generate the schema inventory

- [x] **Status:** Complete
- **Depends on:** 002a complete (Task 1 may run in parallel)

Start the legacy chain locally and enumerate everything it creates:

```bash
cd legacy
npx supabase@<pinned> start        # applies legacy/supabase/migrations to a local stack
```

Then query the local DB (connection info from `supabase status`) to enumerate, **scoped to
owned schemas** (`public` + any custom schemas found; explicitly not `auth`, `storage`,
`realtime`, `extensions`, `graphql*`, `vault`, `supabase_*`):

- tables (+ row-level-security enabled? policies attached?)
- views, materialized views
- enums and other custom types
- functions, triggers
- sequences not owned by serial columns
- roles created by the chain (e.g. `grafana_readonly`, `make_readonly`) and grants
- extensions
- storage buckets if any are created via migrations

Useful starting queries: `information_schema.tables`, `pg_type` (enums), `pg_proc` +
`pg_trigger`, `pg_policies`, `pg_roles`, `pg_extension`. Write the result into
`002b-schema-inventory.md` as one table with columns:
`object | kind | schema | bucket (empty for now) | owning capability (empty) | notes`.

**Done when:** the inventory file lists every owned-schema object from the reference DB
(spot-check the count: first migration alone creates 57 tables) and the file is committed.

---

## Task 3 — Four-bucket classification (with maintainer)

- [ ] **Status:** In progress — **3a complete**; **3b complete**; **3c complete**; **3d** next
- **Depends on:** Task 2

Classify every inventory row into the ADR-008 buckets, in review sessions with the maintainer:

| Bucket | Meaning | Baseline fate |
|---|---|---|
| **Keep** | Owned by a live capability | In the init migration; tag with owning capability (ADR-004 decision 5 map) |
| **Drop** | Dead — behind `一`-prefixed modules, orphaned columns | Not in the init migration |
| **Parameterize** | Company-specific infra (e.g. `grafana_readonly`, `make_readonly` roles) | Not in base; becomes optional/config (mechanism decided here, e.g. documented optional SQL snippet) |
| **Exclude** | Deprecated/historical-only (e.g. `directives`, `lorawan-directives` + enums) | Not in the init migration; company DB keeps them transitionally (ADR-008) |

Also decided here, **per object**: adopter-driven renames and omissions. This is where outside
requirements surface (roadmap assumption 5). Apply the roadmap's rename policy: each rename is
a recorded loan against the capability imports and the cutover.

Every non-keep decision and every rename becomes an entry in
`002b-schema-deviation-register.md` (object, change, rationale, cutover implication). The
register file already contains candidate entries from the ADRs — confirm, amend, or reject
each one during classification.

### Task 3a — Object-level batches

Review inventory rows in grouped batches (tables, enums, roles, …). Record bucket +
capability tag per row. Column drops discovered here are **provisional** until Task 3b.

**Progress:** batches A–D, F1–F6 confirmed. **Task 3a complete** — every inventory row bucketed.

### Task 3b — Column review pass (maintainer, after 3a)

- [x] **Status:** Complete (2026-07-09)

**Purpose:** walk **every column on every keep table** (and keep views) and confirm the final
set of column-level changes before Task 5.

**Companion artifact:** `002b-schema-column-adjustments.md` — one row per column on keep
tables/views:

`table | column | action (keep / drop / rename) | register § | rationale | notes`

- Seed the file from the reference DB (`information_schema.columns` on keep tables), marking
  known drops from Task 3a batches and the register **Column adjustments** section.
- Maintainer reviews table-by-table: add drops, remove drops, flag renames.
- Each **drop** or **rename** must land in the deviation register **Column adjustments**
  (with cutover implication).

**Done when:** `002b-schema-column-adjustments.md` has a final action for every column on every
keep table/view; all confirmed drops/renames are in the deviation register **Column adjustments**
(§1–§10); maintainer signed off batches G1–G4.

**Result:** 587 columns — 535 keep, 49 drop, 3 rename (register #17–#20 + §1–§10). Full migration
chain used as source of truth (repaired after G2).

### Task 3c — Programmability review (maintainer, after 3b)

- [x] **Status:** **Complete** — H1–H5 signed off 2026-07-09
- **Depends on:** Task 3b complete

**Purpose:** sanity-check **keep** enums (per-value), functions, and triggers before Task 5. Object
bucket decisions from Task 3a are not re-litigated unless review surfaces a miss; this pass
confirms value-level trims, function/trigger renames already in the register, orphans, and
architectural fit (e.g. company-specific RLS helpers).

**Companion artifact:** `002b-schema-programmability-review.md` — one row per enum value /
function / trigger on keep objects:

- enum: `enum | value | action (keep / drop) | register § | rationale | notes`
- function: `function | action (keep / drop / rename) | register § | rationale | notes`
- trigger: `trigger | on table | action | register § | rationale | notes`

**Seed from:** reference DB (`pg_enum`, `pg_proc`, `pg_trigger`) + inventory keep rows; pre-fill
register **#10** / **#16** function and trigger renames.

**Review batches (suggested):** H1 RLS helpers → H2 auth/platform RPCs → H3 payments RPCs → H4 enum
value trim (by capability) → H5 triggers vs functions.

**High-attention (not pre-decided):** `rls_check_if_nxt_member()` (NXT-specific RLS — may need
broader architecture discussion), `rls_check_if_lender()`, orphan
`append_rls_organization_id_by_historical_grid_id()`, deferred enum trims (`external_system_enum`,
`notification_type_enum`, customer enums, …). See review backlog in companion file.

Each **drop**, **rename**, or enum **value drop** must land in the deviation register before Task 3
is complete (add **Programmability adjustments** section as needed).

**Done when (Task 3 overall):** Task 3c signed off; programmability artifact complete; register
contains every programmability deviation with cutover implication; maintainer signed off.

### Task 3d — Database-wide performance audit (new, after 3a–3c)

- [x] **Status:** **Complete 2026-07-10** — D1–D4 all signed off (registers #30, #31, #32; D4 had no findings, no register entry)
- **Depends on:** Task 3a, 3b, 3c complete (runs once the full keep-object list — tables, columns,
  enums, functions, triggers, renames — is final, so nothing gets audited twice)

**Purpose:** surfaced during Task 3c H1c (function volatility) but broadened at the maintainer's
request into a full **structural performance audit** of the baseline schema — done now because
this is the point where every keep object is locked in, and before Task 5 authors the init migration
(so findings are inputs to that authoring, not a retrofit) and before Task 6's A/B diff (so any
performance-driven change is registered before the diff runs, avoiding unexplained hunks).

**Scope (structural/static only — see boundary below):**

- **Function volatility** (`VOLATILE` / `STABLE` / `IMMUTABLE`) — not something Supabase sets for
  you; the legacy chain leaves every function at the implicit default `VOLATILE` (confirmed: no
  `CREATE FUNCTION` in the chain declares `STABLE`/`IMMUTABLE`). Unmarked RLS-attached functions can
  be re-evaluated once per row instead of once per statement.
- **RLS policy invocation pattern** — the legacy chain is inconsistent: some policies wrap helper
  calls in a subquery (`( SELECT public.rls_check_if_nxt_member() AS … )`, plan-cacheable), others
  call bare (`public.rls_check_if_nxt_member()`). Distinct from volatility; both matter.
- **Indexes on keep tables** — **new ground, not previously inventoried** (Task 2's inventory has no
  "index" kind at all). 3d must start by enumerating indexes on keep tables from the reference DB,
  then check: FK columns indexed, RLS-predicate columns indexed (e.g. `rls_organization_id`),
  redundant/overlapping indexes, coverage after Task 3 renames (`meter_command_batches` etc.). One
  instance already caught and fixed directly during H1b rather than waiting for this pass — see
  register #25 (`idx_accounts_organization_id`) — because it surfaced while reviewing a specific
  function group; 3d is the systematic sweep for the rest of the schema.
- **Trigger design overhead** — H1b `append_rls_*` group resolved directly during Task 3c rather
  than deferred here: dead join removed, join logic consolidated onto 6 shared helper functions,
  `search_path` hardened. See register #23 and programmability review H1b. 3d still covers
  trigger/view design for objects **outside** that group.
- **View definitions** — e.g. `meters_with_account_and_statuses` (wide view, many joins).

**Out of scope / boundary:** empirical, load-driven tuning (`EXPLAIN ANALYZE` under realistic data
volumes) is not possible yet — there is no data, and per this plan's non-goals, "Any data migration —
this plan ships schema only." That kind of tuning belongs to a later capability-import or
production-readiness pass, once real usage exists. `SECURITY DEFINER` search-path hardening is
already present on most functions in the chain — spot-check only, not a full pass.

**Companion artifact:** new `002b-schema-performance-audit.md` (stub to be created alongside this
task's start) — one section per concern above; findings that change schema shape (new/dropped
indexes, volatility changes, policy rewrites) sync to the deviation register **Performance
adjustments** section (added when 3d starts).

**Done when:** every keep function has a justified volatility marking; RLS policy invocation pattern
is consistent; index coverage for keep tables is reviewed and gaps recorded; all resulting schema
changes are in the deviation register with cutover implications; init migration (Task 5) authors the
schema with the audited shape from the start.

---

## Task 4 — Scaffold the fresh root `supabase/` project

- [x] **Status:** Complete (2026-07-10)
- **Depends on:** 002a complete (can run in parallel with Tasks 1–3)

```bash
# repo root
npx supabase@<pinned> init
```

- Pick and record the pinned CLI version (decisions log + interim tooling rule above).
- Set the Postgres major version in the new `config.toml` to match the legacy one (**15** —
  provisional, for Task 6's A/B diff only; see the PG version flip note under Task 6, which
  moves this to **17** — the leading target — once Task 6 signs off).
- Review generated `config.toml` defaults; keep it minimal (no edge-function config yet).

**Done when:** root `supabase/` exists with `config.toml` and an empty `migrations/`;
`npx supabase@<pinned> start` boots an empty local stack from the repo root.

---

## Task 5 — Author the init migration

- [x] **Status:** Complete (2026-07-10)
- **Depends on:** Tasks 3, 4

Create the single canonical migration, e.g. `supabase/migrations/<timestamp>_init.sql`:

- **Content = keep bucket only**, with renames applied. Practical route: dump the reference DB
  (`pg_dump --schema-only`, owned schemas), then *edit down* per the classification — remove
  drop/parameterize/exclude objects, apply renames, strip dump noise (ownership `ALTER`s, `SET`
  chatter). The result must read as an **authored document**, not a dump: ordered (extensions →
  types → tables → constraints → functions → triggers → policies → grants), commented per section.
- **Data API grants (register #33) — keep, do not strip as "noise":** carry forward
  `GRANT ALL ON TABLE/SEQUENCE/FUNCTION … TO "anon"/"authenticated"/"service_role"` for every keep
  object (Supabase stopped auto-granting these on new projects from 2026-05-30 — without them the
  baseline is not reachable via the Data API at all). **Omit** the 3
  `ALTER DEFAULT PRIVILEGES … GRANT ALL ON TABLES/SEQUENCES/FUNCTIONS TO …` statements — future
  tables (002c capability imports, adopter migrations) get explicit grants per migration instead of
  an ambient auto-expose default. See register #33 / Data API access adjustments §1.
- **Extensions (register #11):** init migration runs `CREATE EXTENSION IF NOT EXISTS` only for
  extensions **not** enabled on a fresh Supabase Postgres image (`postgis`, `pg_net`, `pgsodium`).
  Omit platform defaults (`pg_stat_statements`, `pgcrypto`, `supabase_vault`, `uuid-ossp`),
  `pg_graphql`, advisor extensions (`hypopg`, `index_advisor`), and `pgjwt` (not available on
  Postgres 17 at all; confirmed unused in the legacy schema/app code — amended 2026-07-10).
- **FK cycle hardening (register #34):** the 5 denormalized "latest pointer" FKs
  (`meters.last_metering_hardware_install_session_id`,
  `metering_hardware_install_sessions.last_metering_hardware_import_id`,
  `metering_hardware_install_sessions.last_meter_commissioning_id`,
  `dcus.last_metering_hardware_install_session_id`, `meters.last_encountered_issue_id`) get
  `ON DELETE SET NULL` in the init migration (legacy chain leaves them `NO ACTION`). Their 5
  structural back-pointer counterparts (`metering_hardware_install_sessions.meter_id`/`dcu_id`,
  `metering_hardware_imports.metering_hardware_install_session_id`,
  `meter_commissionings.metering_hardware_install_session_id`, `issues.meter_id`) stay `NO ACTION` —
  unchanged. See register #34 / FK design adjustments §1.
- No company roles, no supabase-managed schema objects, no deprecated/dead objects.
- Objects referencing excluded objects (e.g. `orders` FKs to `directives`) are adjusted per the
  classification decisions — each adjustment is already in the register from Task 3.

**Done when:** `npx supabase@<pinned> db reset` (root) applies the init migration to a clean
local DB with zero errors.

---

## Task 6 — A/B equivalence verification (the core gate)

- [x] **Status:** Complete (2026-07-13)
- **Depends on:** Task 5

Compare old chain vs new baseline **sequentially** (avoids running two local stacks):

1. `cd legacy && npx supabase@<pinned> start` → dump owned schemas:
   `pg_dump --schema-only --no-owner --no-privileges --schema=public …` → `/tmp/schema-old.sql`
   → `supabase stop`.
2. Repo root: `npx supabase@<pinned> start` → same dump → `/tmp/schema-new.sql` → `supabase stop`.
3. Diff: restore both dumps into two throwaway databases in one vanilla Postgres container and
   run **migra** (`migra --unsafe postgresql://…old postgresql://…new`); fall back to a
   normalized textual diff of the dumps if migra chokes. Record the tool + exact invocation in
   the decisions log for repeatability.
4. **Assert:** every line of the diff is explained by an entry in
   `002b-schema-deviation-register.md` — nothing unexplained in either direction. Grants for
   parameterized roles must appear only as register-covered removals.

Iterate Tasks 5↔6 until the assertion holds.

**Done when:** the final diff-vs-register walkthrough is done with the maintainer and each
diff hunk is annotated with its register entry number (keep the annotated diff as an appendix
in the register file).

**PG version flip (after sign-off):** Task 4 set `config.toml`'s `major_version` to **15**
provisionally, matching legacy, so this diff isn't contaminated by PG-version-driven textual
noise on top of the real deviation-vs-register check. Postgres 17 is the leading target for the
OSS baseline going forward (Supabase's current default for all new projects, platform and
self-hosted, as of 2026 — decided in Task 4 discussion, 2026-07-10). Once this task's assertion
holds: flip `config.toml`'s `major_version` to **17** and re-run `npx supabase@<pinned> db
reset` against a clean local PG17 stack to confirm the init migration still applies with zero
errors — the same kind of check that caught the `pgjwt` incompatibility (register #11) before
it became a live blocker; there may be others. **17** is the value that ships from this point
forward. Task 9.2's fresh platform project (provisioned on PG17 by default) is the live
platform-side confirmation. Record the re-verification result in the decisions log.

---

## Task 7 — Prove type generation against the baseline

- [x] **Status:** Complete (2026-07-13)
- **Depends on:** Task 6

With the root stack running on the baseline:

```bash
npx supabase@<pinned> gen types typescript --local --schema public > /tmp/generated-types.ts
```

- Must succeed and contain the keep-bucket tables/enums (spot-check renames).
- The full legacy pipeline (`better-supabase-types`, `fix-supabase-json-type.js`) is **not**
  re-established here — that wiring, its final output location, and the CI drift guard are the
  002c interlock. Do a one-off manual run of it only if cheap, to surface surprises early;
  record findings either way.
- Record the exact gen-types invocation (schema scope!) for 002c to adopt (ADR-004 decision 3:
  owned schemas only).

**Done when:** generation succeeds, output is spot-checked, invocation recorded in the
decisions log.

---

## Task 8 — Local bootstrap + seed decision

- [ ] **Status:** Not started
- **Depends on:** Task 6

1. **Bootstrap proof:** from a clean clone of the branch, repo root:
   `npx supabase@<pinned> start` → baseline applies → done. This is deployment consumer 1
   (roadmap) and the ADR-004 bootstrap flow minus types (002c completes it).
2. **Seed decision (with maintainer):** the ADR-007 config references DB rows
   (`deployment.adminOrganizationId`, `deployment.systemWalletId`). Decide the minimal
   `supabase/seed.sql` for a usable empty deployment (e.g. one organization row) — or decide
   that bootstrap-SQL is documentation, not seed. Record the decision; implement if agreed.

**Done when:** clean-clone bootstrap works; seed decision recorded (and implemented if agreed).

---

## Task 9 — Staged rollout

- [ ] **Status:** Not started
- **Depends on:** Task 8
- **Executor:** maintainer for 9.2/9.3 (platform access)

1. **Local** — done via Task 8.
2. **Fresh Supabase platform project:** maintainer creates a new (non-production) project;
   `npx supabase@<pinned> link --project-ref <new>` from repo root; `db push` applies the
   baseline. Verify in the dashboard (tables, types, no errors) **and** verify a keep table is
   actually reachable via the Data API (e.g. a `supabase-js` `select` call or `curl /rest/v1/...`)
   — a passing dashboard view alone does not prove Data API grants are correct (register #33: new
   projects no longer auto-expose `public` tables as of 2026-05-30). This proves the cloud path
   and is deployment consumer 2.
3. **Adopter instance:** gated on adopter coordination — apply the same procedure to the
   adopter's Supabase project when they are ready. May happen later than this plan's
   completion; leave the checkbox open until it does. Application is operator-controlled and
   deliberate (ADR-009) — never wired to CI.

**Done when:** 9.2 verified clean; 9.3 done or explicitly parked with a note.

---

## Task 10 — Close out

- [ ] **Status:** Not started
- **Depends on:** Tasks 1–9 (9.3 may be parked)

- Deviation register: final read-through; every entry has a cutover implication.
- Roadmap: sub-plan index 002b → Completed; note the interlock deliverables for 002c (baseline
  migrations at root `supabase/`, pinned CLI version, gen-types invocation).
- Decisions log below: complete.

---

## Pre-Task-5 checklist (closed)

All items that blocked authoring the init migration are **done**. Kept here for the record.

- [x] **Task 3b** — Complete (2026-07-09). `002b-schema-column-adjustments.md`: 587 columns; 49 drops; 3 renames; G1–G4 signed off; register §1–§10.
- [x] **Task 3c** — Complete (2026-07-09). H1–H5 signed off; `002b-schema-programmability-review.md` final.
- [x] **Task 3d** — Complete (2026-07-10). D1–D4 signed off — registers #30, #31, #32; `002b-schema-performance-audit.md` final.
- [x] **Task 6 (pre-check)** — Register #11 extension block verified via Task 5 `db reset` on PG15 (provisional), then PG17 flip post-Task-6.

---

## Deferred follow-ups (out of 002b scope)

Not blockers for Tasks 5–7; tracked so they are not lost. Owner/timing is outside this sub-plan unless noted.

- [ ] **ADR-007 amendment follow-up** — Backend `getConfig().deployment.adminOrganizationId` consumers and frontend apps (qilin/pegasus/eos/niffler/sphinx) need a resolution path for the now-DB-native admin organization (register #22). Explicitly deferred in the ADR-007 Amendment (2026-07-09) "Open / deferred" — **revisit at 002c or first capability import**, not 002b.
- [ ] **ADR-004 amendment** — Update §5 capability map: remove `device-data-sink` from (1) Production monitoring; note register **#12** (`devices` / `device_types` / `device_logs` dropped). Update **AGENTS.md** ADR index row if the domain description changes. Doc-only; schema decision already in register.
- [ ] **NXT Grid's own PG15→17 platform upgrade** — Untracked, independent prerequisite surfaced during Task 4 discussion (2026-07-10): OSS baseline targets PG17; NXT Grid production is still on PG15. **Not 002b/002c work** — separate Supabase platform-upgrade project (drop deprecated extensions, re-hash custom-role md5 passwords if any, etc.). Real dependency for company cutover parity (ADR-012); consider naming as an ADR-012 trigger once timeline vs OSS cutover is clearer.

---

## Notes & decisions log

> Append here as the plan is executed. Format: `YYYY-MM-DD — [task] — note`

- 2026-07-08 — [Task 1] — Linked to production (`axenumkepgnwfmdogkqq`). Canonical `npx supabase@2.54.10 db diff --linked --schema public` failed: shadow-DB init errors on storage-api image (`Migration optimize-existing-functions-again not found` — CLI 2.54.10 vs pulled Docker image mismatch). Ran manual equivalent instead: (1) `db dump --linked -s public` + `-s auth`, (2) applied all 19 legacy migrations to a local Supabase Postgres 15 container, (3) compared live production (`inspect db table-stats --linked`) vs migrations DB. **Result: no substantive drift.** 57/57 `public` tables match by name; 42 enums, 27 functions, 140 indexes, 123 RLS policies match; auth triggers `on_auth_user_created` + `on_auth_user_updated` present on both production and migrations-applied DB. Residual dump-format differences only (quoting, `CREATE OR REPLACE` vs `CREATE`, default rendering). Roadmap assumption 4 certified.
- 2026-07-08 — [Task 1 tooling] — Root cause of CLI shadow-DB failure: `supabase link` caches production service pins in `legacy/supabase/.temp/` (`storage-version` v1.64.0, `storage-migration` optimize-existing-functions-again) that CLI 2.54.10's bundled storage-api cannot satisfy. Workaround: `rm legacy/supabase/.temp/storage-migration storage-version` before `db diff`/`db start`. Confirmed: `npx supabase@2.54.10 db diff --linked` and `db start` work after cache clear; canonical diff output is 2 cosmetic function-body formatting hunks only. `npx supabase@2.109.1 db diff --linked` works without cache clear. Full `supabase start` still blocked by deleted edge function refs in `config.toml` (`meter-consumption-2`). Task 4 CLI pin candidate: ≥2.62.10 or 2.109.1.
- 2026-07-08 — [Task 2] — Reference DB via `npx supabase@2.54.10 db start` (local only, no link). Inventory written to `002b-schema-inventory.md`: 191 rows — 57 tables, 4 views, 42 enums, 27 functions, 27 public triggers, 2 auth.users triggers, 17 sequences (nextval-owned), 3 roles, 11 extensions, 0 storage buckets. Owned schema: `public` only.
- 2026-07-08 — [Task 3 batch A] — Parameterize: 3 roles + 6 Make grid hooks (9 inventory rows). Delivery = separate operator recipes under `docs/database/optional/` (not in `supabase/migrations/`). Grafana/make bundles include their RLS policies. Register #2, #3, #5, #6 confirmed.
- 2026-07-08 — [Task 3 batch B] — Exclude deprecated directive system (register #1 confirmed): tables `directives`/`lorawan_directives`, view `batch_commands`, 6 enums (incl. `directive_type` + `directive_special_status` after column drops on keep tables), triggers/seq. Keep `directive_batches`/`directive_batch_executions` (rename candidates). Column adjustments §1: drop `orders.directive_id`/`lorawan_directive_id`, `directive_batches.directive_type`, `meters.current_special_status`, view column. Column prune backlog started (§pending).
- 2026-07-08 — [Task 3 batch C] — Exclude deprecated meter credit transfers (register #7 confirmed): table `meter_credit_transfers`, enum `meter_credit_transfer_status_enum`, sequence `meter_credit_transfers_id_seq`, trigger, function `append_rls_organization_id_by_receiver_meter_id()`. Register #4 narrowed to drop `directive_watchdog_sessions` only (`一demo` has no schema). Column adjustments §2: drop `orders.meter_credit_transfer_id`.
- 2026-07-08 — [Task 3 batch D] — Drop dead schema (registers #4, #8, #9 confirmed): `directive_watchdog_sessions`, `features`/`member_feature`, `public.migrations` (+ sequences/indexes/policies). No archive at cutover. `energy_cabins` **keep** (1) Production monitoring — pegasus map layer; tagged early outside Batch F.
- 2026-07-08 — [Task 3 batch F1] — Platform core **keep** (inventory tagged): accounts, orgs, members, agents, api_keys, grids, poles, `dcus`, routers, `agents_with_account`, auth triggers/functions, RLS helpers, platform enums. Register **#11** confirmed (extension policy). Storage bucket inventory row = placeholder only.
- 2026-07-09 — [Task 3 register #10 amended] — DCU→gateway rename **withdrawn**; register #10 narrowed to router trigger typo only (`append_rls_organization_id_on_route_insert` → `…_on_router_insert`). Column adjustments §3 removed.
- 2026-07-09 — [Task 3 batch F2] — Production monitoring **keep**: `mppts`, `solcast_cache`, `energy_cabins`, enums, mppt/cabin triggers, `get_grid_status`. Register **#12** **drop**: device registry. Column adjustments §4: drop `meters.device_id`.
- 2026-07-09 — [Task 3 batch F4] — Payments **keep**: `banks`, `wallets`, `transactions`, `orders`, payment enums (except `payout_status_enum`), `find_*` revenue RPCs, `lock_next_order_and_wallets`, wallet/transaction triggers. Register **#13** **drop**: `payouts`, `bank_accounts`, `payout_status_enum`, `lock_next_order()` (+ sequences/policies). `currency_enum` stays under **(3) Payments** (ADR-004 capability tag).
- 2026-07-09 — [Task 3 batch F5] — Notifications **keep**: `notifications`, `notification_parameters`, `notification_status_enum`, `notification_type_enum` (enum value trim deferred). No drops. Grid/member notification toggle columns deferred to Task 3b.
- 2026-07-09 — [Task 3 batch F6] — Field ops **keep**: `issues`, `notes`, `audits`, `pd_sites`, `pd_site_submissions` + issue enums/triggers. Register **#14** **drop**: pd-hero workflow subgraph + `lock_next_pd_action()`. Register **#15** **drop**: `autopilot_executions` (deferred capability). Column adjustments §5: drop `pd_sites.pd_flow_id`. `append_rls_organization_id_by_customer_id()` tagged shared (no capability).
- 2026-07-09 — [Task 3 batch F3] — Metering **keep**: customers, connections, meter_interactions, hardware install/import, USSD, views, enums, triggers. Register **#16** **rename**: `directive_batches` → `meter_command_batches`, `directive_batch_executions` → `meter_command_batch_executions` (+ sequences, function, triggers; column §6: `directive_batch_id` → `meter_command_batch_id`). `communication_protocol_enum` keep all values; customer enums keep (value trim deferred). No metering drops. **Task 3a complete.**
- 2026-07-08 — [Task 3 plan] — Split Task 3 into **3a** (object batches), **3b** (column review), and **3c** (programmability: enums/functions/triggers). Column artifact: `002b-schema-column-adjustments.md`; programmability artifact: `002b-schema-programmability-review.md`.
- 2026-07-09 — [Task 3b start] — Generated `002b-schema-column-adjustments.md` from legacy migration SQL (589 columns: 576 keep, 12 drop pre-filled, 1 rename). Docker unavailable for `information_schema` cross-check. Review batches G1+ (platform core first). §pending + register §1–§6 pre-filled; sync to register on batch sign-off.
- 2026-07-09 — [Task 3b G1] — Platform core signed off. **12 new drops:** `organizations.phone/address/pd_hero_google_drive_folder_id`, `api_keys.is_locked`, `dcus.queue_buffer_length`, `grids.is_automatic_payout_generation_enabled/telegram_response_path_autopilot/are_all_dcus_online/are_all_dcus_under_high_load_threshold/meter_*_threshold_*/uses_dual_meter_setup`. **Keeps confirmed:** notification toggles, `members.subscribed_to_telegram_revenue_notifications`, `grids.feature_access_config`. Register **#17** + column §3, §5 (amended), §7, §15 added; §pending narrowed to watchdog columns.
- 2026-07-09 — [Task 3b G2] — Metering signed off. File regenerated from full migration chain (fixes stale `goldring_migration_id`/`process_meta`, adds `task_type`/`batch_execution_id`/`payload_data`/etc.). **15 new drops:** watchdog cols (§4b, register #4), `directive_batches.lock_session/execution_bucket`, `meter_commissionings.*_steps/lock_session`, `meters.power_down_count/power_down_count_updated_at/is_simulated/pulse_counter_kwh/pulse_counter_kwh_updated_at` (+ view mirrors). Register **#18** + column §4b, §8; §pending cleared.
- 2026-07-09 — [Task 3b G3] — Payments + production monitoring signed off. Pre-filled order drops confirmed (§1, §2). **2 new drops:** `wallets.goldring_migration_id`, `orders.external_system`. Register **#19** + column §9.
- 2026-07-09 — [Task 3b G4] — Notifications + field ops signed off. `pd_sites.pd_flow_id` confirmed (§5). **2 renames:** `issues.external_system` → `external_tracking_system`, `issues.external_reference` → `external_tracking_reference`. **4 drops:** `issues.estimated_lost_revenue`, `snoozed_until`, `mppt_id`, `grid_id`. Register **#20** + column §10.
- 2026-07-09 — [Task 3b close] — **Task 3b complete.** All keep table/view columns reviewed (G1–G4). Enum value trim deferred to new **Task 3c** (programmability review). Companion stub: `002b-schema-programmability-review.md`.
- 2026-07-09 — [Task 3c start] — Generated `002b-schema-programmability-review.md` from full migration chain: 179 enum values (31 keep types), 20 functions, 21 triggers (19 public + 2 auth). Batch order: H1 (RLS helpers, split H1a/H1b/H1c) → H2 (auth/platform RPCs) → H3 (payments RPCs) → H4 (enum trim) → H5 (triggers).
- 2026-07-09 — [Task 3c H1a] — Signed off: `rls_check_if_lender()` keep; `append_rls_organization_id_by_historical_grid_id()` **drop** (orphan, register #21); `append_rls_organization_id_by_directive_batch_id()` rename confirmed (register #16). H1b (`append_rls_*` + triggers) split into a one-function-per-turn queue (10 items); H1c (`rls_check_if_nxt_member`) deferred as a separate architecture discussion.
- 2026-07-09 — [Task 3c H1c] — **Architecture decision, not a simple keep/drop:** `rls_check_if_nxt_member()` hard-codes `nxt_org_id := 2`; RLS cannot read `getConfig().deployment.adminOrganizationId` (ADR-007). Signed off: admin organization becomes **DB-native** — new enum value `organization_type_enum.PLATFORM_OPERATOR`, partial unique index (at most one), sync trigger on `organizations` maintaining a Postgres GUC (`app.admin_organization_id`) for fast RLS reads; function renamed → `rls_check_if_admin_org_member()`, marked `STABLE`. Register **#22** + Programmability adjustments §3. Full rationale recorded in **ADR-007 Amendment (2026-07-09)** (supersedes part of decisions 1/10); how backend `getConfig()` consumers and frontend apps resolve the now-DB-native value is explicitly **left open** in the amendment for later review.
- 2026-07-09 — [Task 3c scope changes] — Two process adjustments from maintainer: (1) new **Task 3d — Programmability performance audit** added, scoped to `VOLATILE`/`STABLE`/`IMMUTABLE` function markings (surfaced by the H1c `STABLE` discussion; not a Supabase default, legacy chain leaves every function `VOLATILE`) — runs after Task 3c closes, before Task 5. (2) **H1b** (`append_rls_*` + their triggers) will be reviewed as **one group discussion**, not one-by-one per function — an explicit exception to discussing other functions individually.
- 2026-07-09 — [Task 3c H1b] — Signed off. Correctness check on all 10 `append_rls_*` functions found no logical bugs, but 3 structural issues fixed **now** rather than deferred to Task 3d (maintainer preference — fix as issues surface, matching how H1c's performance issue was handled): (1) dead join to `organizations` in `by_account_id()` removed; (2) second dead lookup in the `organization_id` branch of `by_customer_id_or_agent_id_or_connec()` removed; (3) `SET search_path TO ''` added to all 10 (9 were missing it) — addresses Supabase "Function Search Path Mutable" linter warning. Broadened the search_path audit beyond this group per maintainer request ("ANY function"): also fixed on `lock_next_order_and_wallets()` (register #24; only other keep function missing it). Traced join-depth/index-coverage concern raised earlier — **retracted**: every join in every function resolves via a primary-key lookup (walk from known child row up through FK values to parent PKs), already optimal; no missing index. Found a **different**, real gap while tracing: `accounts.organization_id` backs 2 RLS policies with no supporting index (unlike every other RLS-filtered org column in the schema) — added `idx_accounts_organization_id` (register #25). Main architectural question — "can the rls_ column/trigger pattern be simplified?" — answered: **keep the denormalize-via-trigger strategy** (correct trade for read-heavy RLS; STABLE alone wouldn't help a per-row-varying join at query time), but **consolidate the duplicated join logic**: 10 trigger functions now delegate to **6 new** shared helper functions (`rls_org_id_from_grid/customer/connection/agent/meter/dcu`), each `LANGUAGE sql STABLE` (inlining-eligible, so delegation costs nothing at runtime vs. inlining the join by hand). Register **#23** (redesign) + Programmability adjustments §4–§6.
- 2026-07-09 — [Task 3c H2] — Signed off (one function at a time). `handle_new_user()` **keep** — bare account row on auth INSERT; already hardened. `handle_update_user()` **keep** — syncs `organization_id` to `accounts` for RLS; `account_type`/`member_type` stay JWT-only. `get_grid_status()` **keep + redesign** (register **#26**) — drop `are_all_dcus_online` + `are_all_dcus_under_high_load_threshold` from return type (columns dropped in register #17; pegasus uses separate `dcus` query for gateway alerts); mark **`STABLE`**. Programmability adjustments §7.
- 2026-07-09 — [Task 3c H3] — Signed off (one function at a time). `lock_next_order_and_wallets()` **keep** — atomic `FOR UPDATE SKIP LOCKED` payment lock; search_path fix already in register **#24**; stays `VOLATILE`. `find_energy_topup_revenue()` **keep + `STABLE`** (register **#27**). `find_top_spenders()` **keep + `STABLE` + GROUP BY fix** (#27) — drop `meta_receiver_id` (meter) from `GROUP BY` so top-spender rankings aggregate at customer level. Programmability adjustments §8.
- 2026-07-09 — [Task 3c H4a] — Platform-core enum trim signed off. `account_type_enum`, `organization_type_enum`, `weather_type_enum` **keep all**. `member_type_enum` **keep all 10** (RBAC vocabulary). `external_system_enum` **keep 11, drop 3** — drop `JOTFORM` (pd-hero #14), `STEAMACO`, `ACREL`; **keep `JIRA`** (required by `issues.external_tracking_system`, same enum type, DB default). Register **#28** + Programmability adjustments §9.
- 2026-07-09 — [Task 3c H4b] — Metering enums signed off. **Keep all** — no drops (`communication_protocol_enum`, customer enums, all core metering status/type enums).
- 2026-07-09 — [Task 3c H4c/H4d/H4e] — **H4 closed.** H4c payments + H4e field ops/production monitoring: **keep all**. H4d notifications: **keep 15, drop `AUTO_PAYOUT_GENRATION_REPORT`** only (payouts #13). Total enum value drops in H4: 4 (`external_system_enum` ×3, `notification_type_enum` ×1). Registers **#28**, **#29**.
- 2026-07-09 — [Task 3c H5a] — `append_rls_*` INSERT triggers signed off. **Keep all 19** — wiring confirmed vs H1b; 3 renames unchanged (#10 router, #16 ×2 meter command batches). No new register entries (already in #10/#16).
- 2026-07-09 — [Task 3c H5b/H5c] — **H5 closed; Task 3c complete.** H5b: keep `on_auth_user_created` + `on_auth_user_updated`. H5c: **add** `sync_admin_organization_id_guc` on `organizations` (#22).
- 2026-07-09 — [Register #16 amended] — Target names corrected: `meter_task_*` → **`meter_command_*`** (`meter_command_batches`, `meter_command_batch_executions`, `meter_command_batch_id`, function/trigger/index renames). Rationale: align with "command batch" domain language vs generic "task".
- 2026-07-09 — [Task 3d broadened] — Maintainer: Task 3d should be a **database-wide** structural performance audit, not just function volatility — done at this point because Task 3a–3c lock in the full keep-object list before Task 5 authors the init migration and Task 6 diffs it. Scope now also covers: RLS policy invocation pattern (bare vs. subquery-wrapped helper calls — legacy chain is inconsistent), index coverage on keep tables (**gap found:** Task 2's inventory never captured indexes as objects at all — 3d starts by enumerating them from the reference DB), trigger design overhead, view definitions. Explicit boundary: empirical/load-driven tuning (`EXPLAIN ANALYZE` under real data volume) is out of reach until a capability import brings real usage — plan ships schema only, no data migration. New companion artifact stub: `002b-schema-performance-audit.md`.
- 2026-07-10 — [Task 3d D1 signed off] — Batch order proposed and accepted: D1 (indexes) → D2 (function volatility) → D3 (RLS invocation pattern) → D4 (remaining triggers/views). D1: Docker was reachable this session, so queried the reference DB live (`pg_indexes`, FK constraints, `pg_policies`) across the 35 keep tables (105 existing indexes) instead of parsing migration SQL. **Gap sweep found 47 missing indexes** — Tier 1 (3, direct analog of register #25: `grids.organization_id`, `metering_hardware_imports.rls_organization_id` — table had zero non-PK indexes, `meter_command_batch_executions.meter_command_batch_id`) + Tier 2 (44 plain FK-column hygiene across 22 tables, e.g. `audits` had 8 unindexed FKs and only a PK index). Maintainer signed off both tiers as-is — register **#30** + Performance adjustments §1. Reviewed and excluded: 2 write-only FK columns with no read path (`members.busy_commissioning_id`, `meters.rls_grid_id`); 2 `orders` partial/full index pairs confirmed intentional (hot-path optimization), not redundant. **Observations** (RLS `qual = true` on `meter_interactions`/`wallets`; zero policies on `notifications`) kept as documented reference in the audit doc only — not a register entry (no schema change, so not a deviation) per maintainer request. D2–D4 not started.
- 2026-07-10 — [Task 3d D2 signed off] — Cross-checked all 26 keep functions against Task 3c's volatility decisions; only 2 had none: `rls_check_if_lender()`, `rls_get_member_org_id()` — both single-statement `auth.jwt()` reads, no side effects, same shape as `rls_check_if_admin_org_member()` (register #22, already `STABLE`). `rls_get_member_org_id()` is the most-invoked RLS helper in the schema (~24 policies across ~20 keep tables). Maintainer signed off marking both `STABLE` — register **#31** + Performance adjustments §2. Everything else already decided in 3c or correctly left `VOLATILE` by default (write side effects, or trigger functions where volatility marking has no planner effect). D2 complete; D3 (RLS invocation pattern) next.
- 2026-07-10 — [Task 3d D3 signed off] — Parsed all 123 `CREATE POLICY` statements (single migration file, never later altered) for the 35 keep tables; found 69 calls to the 3 policy-attached RLS helper functions (`rls_check_if_admin_org_member()`, `rls_check_if_lender()`, `rls_get_member_org_id()`), of which 51 were already subquery-wrapped (`( SELECT public.fn() AS fn )` — the cacheable `InitPlan` pattern) and 18 were bare, every one of them on an `INSERT`/`WITH CHECK` or `UPDATE`/`USING` clause (zero on `SELECT` — those were all already wrapped). Maintainer signed off normalizing all 18 to the wrapped form — register **#32** + Performance adjustments §3. Pairs with D2 (`STABLE`), which is what makes the wrap's caching valid. D3 complete; D4 (remaining triggers/views) next.
- 2026-07-10 — [Task 3d D4 signed off — **Task 3d complete**] — Checked every keep trigger and keep view against the plan's design-overhead/index-coverage concerns. Triggers: all fall into 2 already-resolved groups — `append_rls_*` (18, Task 3c H1b/register #23) and `auth.users` sync (`handle_new_user`/`handle_update_user`, Task 3c H2); spot-checked the `auth.users` group's design since it's outside the flagged family — single-statement, and `handle_update_user()`'s lookup column (`accounts.supabase_id`) already has a unique index. No third trigger group exists. Views: all 3 keep views' (`agents_with_account`, `customers_with_account`, `meters_with_account_and_statuses`) join columns are already index-covered (PKs or D1-confirmed FK indexes); `customers_with_account`'s one correlated subquery is a legacy design choice on an indexed column, noted not changed (views carried over as-is, same posture as D1's RLS-content observations). **Zero findings — no register entry.** Task 3d closed: D1–D4 all signed off, `002b-schema-performance-audit.md` final.
- 2026-07-10 — [Final sanity wrap-up, item 1/4] — Checked whether `orders.directive_status` needed renaming to `delivery_status` (maintainer's recollection). No such DB column exists on `orders` (only `directive_id`, dropped per register #1) — traced to the actual source: an **API response field** literally named `directive_status` in `tiamat`'s `getOrderDetailsPublic()` (`orders.service.ts`), with a stale inline comment `/* delivery_status */` flagging an intended rename that was never done. Sourced from `meter_interactions.meter_interaction_status`, already correctly named. Out of scope for the DB baseline (app-layer response shape, not a schema object) — left alone at maintainer's direction, no register entry.
- 2026-07-10 — [Final sanity wrap-up, item 2/4] — Checked `pg_graphql` handling (register #11) against current Supabase behavior: confirmed via Supabase's changelog that `pg_graphql` stopped being enabled by default on **2026-05-18** (existing projects with 30+ days zero GraphQL usage were auto-disabled too — explains current production state). Register #11's decision to omit `pg_graphql` from the init migration is unaffected and correctly matches current platform reality; no change needed.
- 2026-07-10 — [Final sanity wrap-up, item 3/4 — **register #33 added**] — Found a real, previously-unaddressed gap while checking Supabase's recent Data API changes: as of **2026-05-30**, new Supabase projects no longer auto-grant `anon`/`authenticated`/`service_role` access to `public` tables (enforced on **all** existing projects — new tables only — from 2026-10-30); without an explicit `GRANT`, PostgREST returns `42501` before RLS is even evaluated. The legacy migration chain's dump contains exactly the grants now required explicitly (`GRANT ALL ON TABLE/SEQUENCE/FUNCTION … TO anon/authenticated/service_role` per object, plus 3 `ALTER DEFAULT PRIVILEGES` statements for future tables) — but Task 5's original wording ("strip … supabase-managed grants") risked stripping the very grants that are now load-bearing, not just dump noise. Resolved: **keep** explicit per-object grants for all keep tables/sequences/functions (makes the baseline self-contained, independent of project-creation toggles or hosting mode); **omit** the 3 `ALTER DEFAULT PRIVILEGES` auto-expose-future-tables statements (deliberate alignment with Supabase's now-recommended explicit-grant-per-migration pattern; costs nothing today since production's existing tables are grandfathered regardless — this only shapes the baseline template and future 002c capability-import migrations). Register **#33** + new **Data API access adjustments** §1. Task 5 amended (grants section); Task 9.2 done-when amended (verify Data API reachability on the fresh hosted project, not just dashboard-clean). Also fixed a stale note found in the same pass: register file's "§pending — Performance backlog" still said D4 "not yet started" — corrected to reflect D1–D4 complete.
- 2026-07-10 — [Final sanity wrap-up, item 4/4 — **register #34 added**] — Maintainer recalled "back-and-forth" FK pointers between `meters`/`metering_hardware_install_sessions`/`metering_hardware_imports`/`meter_commissionings` and suspected redundancy/deletion/query-cost issues; asked for a full sweep. Built the complete FK graph across all 35 keep tables and searched for cycles: found exactly **5 direct 2-cycles** (confirmed complete via an independent `last_`/`latest_` column-name sweep), **0 cycles of length 3+** — the 3 named plus 2 more of the same shape (`dcus` ↔ `metering_hardware_install_sessions`; `meters` ↔ `issues`). All 5 are the same pattern: a denormalized "latest child" pointer column paired with the child's structural back-reference to its parent. Traced app-code usage and confirmed **all 5 are legitimate and actively read** — not redundant: explicit intent comment in `dcus.service.ts` ("point at the latest dcu session, so it's easily retrievable"), heavy use in the `meters_with_account_and_statuses` view (chains 4 of the 5 in one query), PostgREST embeds in `meter-installs.service.ts`/`meter-uninstalls.service.ts`, and a TypeORM `@OneToOne`. Checked indexing: both sides of every cycle are already covered (forward pointers via pre-existing `UNIQUE` constraints; structural back-pointers via register #30/Task 3d D1) — the query-efficiency concern is already resolved by prior work. Checked deletion: all 10 FKs in these cycles default to `NO ACTION` (real gap, matches the "hard to delete" complaint), but a full `legacy/` codebase sweep found **zero** hard-deletes anywhere (every removal is a soft-delete or status transition) — not live-impacting today, a latent trap for future manual/ops deletes. Maintainer accepted the recommendation: add `ON DELETE SET NULL` to the 5 forward pointers only; leave the 5 structural back-pointers `NO ACTION`. Register **#34** + new **FK design adjustments** §1. Task 5 amended (FK hardening bullet). This closes the final sanity wrap-up (items 1–4 of 4).
- 2026-07-10 — [Task 4 CLI pin] — Confirmed **`2.109.1`** as the Task 4 pin (also the current
  latest published stable release, checked live against the npm registry — nothing newer except
  `2.110.0-beta.*` prereleases). Matches Task 1's "≥2.62.10 or 2.109.1" candidates and Task 1's
  finding that 2.109.1 works without the `.temp` cache-clear workaround 2.54.10 needed. Per the
  interim tooling rule, this is a single frozen version for the rest of 002b (Tasks 4–9), not
  something to keep bumping — only revisited if a concrete blocker forces it, same as Task 1's
  workaround was a logged exception, not routine maintenance. Feeds the 002c workspace pin.
- 2026-07-10 — [Task 4 discussion — register #11 amended, `pgjwt` dropped] — While discussing
  Task 4's Postgres major-version pin, checked whether a fresh Supabase project today still
  provisions on PG15 (the plan's working assumption): it does not — Supabase now defaults **all**
  new projects (platform and self-hosted) to **Postgres 17** as of 2026; regular users cannot
  pick PG15 at creation (version selector is gated behind an internal Supabase-staff-only flag).
  Cross-checked register #11's extension list against PG17: `postgis`/`pg_net` remain compatible;
  `pgsodium` is "pending deprecation" per Supabase but not removed; **`pgjwt` is not available on
  PG17 at all** (removed from the image bundle alongside `timescaledb`/`plv8`/`plcoffee`/`plls`) —
  our planned `CREATE EXTENSION IF NOT EXISTS "pgjwt"` would have failed outright on any PG17
  project (i.e. every new adopter project going forward, and Task 9.2's fresh project). Grepped
  the full legacy migration chain + all app code for pgjwt's functions (`sign`/`verify`/
  `url_encode`/`url_decode`/`algorithm_sign`) — zero usage beyond the bare `CREATE EXTENSION`
  line, matching Supabase's own guidance that it's normally safe to disable. **Register #11
  amended:** drop `pgjwt` from the init migration's extension list — no functional loss, removes
  a cross-version landmine before Task 5.
- 2026-07-10 — [Task 4 discussion — PG version strategy] — Maintainer: **Postgres 17 is the
  leading target** for the OSS baseline (matches Supabase's own new-project default; "no forks,
  single-track" per ADR-004 argues for one baseline valid across whatever PG version an
  operator's project happens to run, rather than picking 15 specifically). Resolved the tension
  with Task 6's "apples to apples" A/B-diff requirement (Option A, chosen over running Task 6
  cross-version): Task 4's `config.toml` sets `major_version = 15` **provisionally**, matching
  legacy, so Task 6's diff isn't contaminated by PG-version-driven textual noise on top of the
  real deviation-vs-register check. Once Task 6 signs off, `config.toml` flips to `major_version
  = 17` and the init migration is re-verified with a clean `db reset` on a local PG17 stack (same
  kind of check that just caught the `pgjwt` incompatibility) — **17** ships from that point
  forward; Task 9.2's fresh platform project (already PG17 by default) is the live confirmation.
  Plan text amended: Task 4 bullet + new "PG version flip" note under Task 6's done-when. Also
  surfaced and logged as an open follow-up: NXT Grid's own production PG15→17 upgrade is a real,
  currently untracked, independent prerequisite for full cutover parity — not 002b/002c scope,
  no committed Supabase timeline, but worth an ADR-012 trigger once clearer.
- 2026-07-10 — [Task 4 complete] — Maintainer-executed (agent guiding step by step, per roadmap
  division-of-labor). `npx supabase@2.109.1 init` at repo root scaffolded `supabase/config.toml`
  + empty `migrations/` (also updated root `.gitignore` with newer CLI's env-file ignore
  patterns — harmless template side effect). Generated `config.toml` defaulted `db.major_version`
  to **17** (confirms the Task 4 discussion finding live); set to **15** per the agreed PG version
  strategy (provisional, for Task 6's A/B diff — flips to 17 after Task 6 signs off, see note
  under Task 6). Reviewed remaining generated defaults against "keep it minimal": nothing to
  strip — the newer CLI template has no `[functions.*]` block to omit in the first place (those
  are only added by `supabase functions new`), and all other new sections (`db.migrations`,
  `db.seed`, `storage.vector`, `auth.oauth_server`, `experimental.pgdelta`, etc.) are inert
  platform-service scaffolding, not edge-function config. `npx supabase@2.109.1 start`: first
  attempt failed — cold image pull hit Docker registry rate-limiting (`toomanyrequests`, ~5.5min
  with retries), and the `analytics` (Logflare) + `vector` containers missed their health-check
  window afterward, so the CLI tore the stack down. Diagnosed as image-pull/health-check
  flakiness, not a config problem (container logs showed normal startup chatter, no fatal error;
  `WARN: no files matched pattern: supabase/seed.sql` is the expected/harmless Task 8 seed-file
  gap, unrelated to the failure). `stop` + retry succeeded immediately once images were cached —
  local stack came up healthy (DB, auth, storage all reporting). **Done-when met:** root
  `supabase/` exists with `config.toml` + empty `migrations/`; `start` boots an empty local stack
  from the repo root.
- 2026-07-10 — [Task 5 complete] — Authored `supabase/migrations/20260710120000_init.sql` (3,178 lines) from the legacy reference dump edited down per the deviation register (#1–#34 and all adjustment sections). Generation pipeline archived at `docs/plans/002-oss-migration/002b-task5-generation/` (reproducible — re-run verified byte-for-byte identical). Maintainer ran `npx supabase@2.109.1 db reset` from repo root: **zero errors**, done-when met. Also during Task 5 prep: `legacy/supabase/config.toml` `project_id` set to `skyfox-legacy` (avoids Docker volume collision with root `nxt-backend` stack); stale `meter-consumption-2` edge-function ref disabled; analytics disabled for legacy local stack stability.
- 2026-07-13 — [Task 6 complete] — Re-ran A/B verification (PG15 provisional): dumps
  `/tmp/schema-old.sql` (legacy chain) vs `/tmp/schema-new.sql` (baseline after `db reset`).
  Comparison tool archived at `docs/plans/002-oss-migration/002b-task6/compare_schemas.py`.
  **226 explained diffs**, 9 script false-positives (all resolved — see register appendix).
  Annotated diff appendix written to `002b-schema-deviation-register.md`. Maintainer sign-off.
  Also: disabled `[analytics] enabled = false` on root `config.toml` (see note below).
- 2026-07-13 — [Local Supabase startup reliability] — Observed **two distinct** local
  `supabase start` failure modes, not one: (1) cold Docker image pull / rate-limiting
  (Task 4 first attempt — resolved by retry once images cached); (2) `analytics` +
  `vector` containers reporting **unhealthy** before the CLI's `health_timeout` (2m)
  elapses — consistent across Jul 10 and Jul 13 sessions on the root stack. Disabling
  `[analytics] enabled = false` skips both services (vector is coupled to analytics)
  and root `start` succeeded immediately afterward; legacy stack already used the same
  setting. This is a **pragmatic local-dev default**, not a proof that analytics is
  always the root cause — a longer `db.health_timeout` may help if you want analytics
  locally. Documented inline in `supabase/config.toml`.
- 2026-07-13 — [PG17 flip complete] — `supabase/config.toml` `db.major_version` flipped
  **15 → 17**. PG15 Docker volume wiped (`npx supabase@2.109.1 stop --no-backup` — required;
  PG15 data dir incompatible with PG17 server). Fresh PG17 stack: init migration applied with
  **zero errors** on first `start` (same NOTICEs: pg_net skip, 2 identifier truncations).
  Verified: `SHOW server_version` → **17.6**; `one_platform_operator_org` index live.
- 2026-07-13 — [Task 7 complete] — Type generation against PG17 baseline succeeded.
  Invocation (record for 002c): `npx supabase@2.109.1 gen types typescript --local --schema public`.
  Output: 3,297 lines. Spot-check: `meter_command_batches` / `meter_command_batch_executions`
  present; `directive_*` / `payouts` / `devices` absent; `PLATFORM_OPERATOR` enum value and
  `rls_check_if_admin_org_member` RPC present. Full legacy `better-supabase-types` pipeline
  deferred to 002c per plan.
