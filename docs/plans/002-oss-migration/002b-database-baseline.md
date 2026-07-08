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
  Task 2/3).
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
- **Edge functions:** `legacy/supabase/functions/` (`customers`, `meter-consumption`,
  `meter-consumption-2`, `orders`, `_shared`) — code, not schema; out of scope here (they are
  re-homed during capability imports).
- **Production project:** ref `axenumkepgnwfmdogkqq` (from the legacy `gen-types-remote`
  script). Production schema is assumed identical to the old chain (roadmap assumption 4 —
  certified in Task 1).

## Non-goals

- **TimescaleDB** — belongs to the Production Monitoring capability import (roadmap assumption 3).
- **Edge functions** — re-homed during capability imports.
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

- [ ] **Status:** Not started
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

- [ ] **Status:** Not started
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

- [ ] **Status:** Not started
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

**Done when:** no inventory row has an empty bucket; every keep row has a capability tag;
the deviation register contains every non-keep decision and rename, each with a cutover
implication; maintainer has signed off.

---

## Task 4 — Scaffold the fresh root `supabase/` project

- [ ] **Status:** Not started
- **Depends on:** 002a complete (can run in parallel with Tasks 1–3)

```bash
# repo root
npx supabase@<pinned> init
```

- Pick and record the pinned CLI version (decisions log + interim tooling rule above).
- Set the Postgres major version in the new `config.toml` to match the legacy one.
- Review generated `config.toml` defaults; keep it minimal (no edge-function config yet).

**Done when:** root `supabase/` exists with `config.toml` and an empty `migrations/`;
`npx supabase@<pinned> start` boots an empty local stack from the repo root.

---

## Task 5 — Author the init migration

- [ ] **Status:** Not started
- **Depends on:** Tasks 3, 4

Create the single canonical migration, e.g. `supabase/migrations/<timestamp>_init.sql`:

- **Content = keep bucket only**, with renames applied. Practical route: dump the reference DB
  (`pg_dump --schema-only`, owned schemas), then *edit down* per the classification — remove
  drop/parameterize/exclude objects, apply renames, strip dump noise (ownership `ALTER`s,
  supabase-managed grants, `SET` chatter). The result must read as an **authored document**,
  not a dump: ordered (extensions → types → tables → constraints → functions → triggers →
  policies → grants), commented per section.
- No company roles, no supabase-managed schema objects, no deprecated/dead objects.
- Objects referencing excluded objects (e.g. `orders` FKs to `directives`) are adjusted per the
  classification decisions — each adjustment is already in the register from Task 3.

**Done when:** `npx supabase@<pinned> db reset` (root) applies the init migration to a clean
local DB with zero errors.

---

## Task 6 — A/B equivalence verification (the core gate)

- [ ] **Status:** Not started
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

---

## Task 7 — Prove type generation against the baseline

- [ ] **Status:** Not started
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
   baseline. Verify in the dashboard (tables, types, no errors). This proves the cloud path
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

## Notes & decisions log

> Append here as the plan is executed. Format: `YYYY-MM-DD — [task] — note`

_(empty)_
