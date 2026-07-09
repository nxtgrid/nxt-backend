# Schema Performance Audit (working review)

**Companion to:** `002b-database-baseline.md` — **Task 3d**
**Status:** Not started — generate after Task 3a, 3b, 3c are all complete (the keep-object list must
be final before auditing it).

## Purpose

A **structural/static** performance audit of the OSS baseline schema, done once every keep object
(tables, columns, enums, functions, triggers, renames) is locked in from Task 3a–3c, and before Task 5
authors the init migration / Task 6 diffs it against the old chain — so findings are inputs to the
migration, not a retrofit, and any resulting schema change is registered before the A/B diff runs.

**Not in scope:** empirical, load-driven tuning (`EXPLAIN ANALYZE` under realistic data volume). There
is no data yet — per this plan's non-goals, "Any data migration — this plan ships schema only." That
kind of tuning belongs to a later capability-import or production-readiness pass, once real usage
exists.

## Scope

| concern | seed from | notes |
|---------|-----------|-------|
| Function volatility | `pg_proc.provolatile` on keep functions (Task 3c list) | Legacy chain leaves every function at the implicit default `VOLATILE` — confirmed no `CREATE FUNCTION` declares `STABLE`/`IMMUTABLE`. RLS-attached functions matter most: unmarked, they can be re-evaluated once per row instead of once per statement. |
| RLS policy invocation pattern | `pg_policies` USING/WITH CHECK clauses | Legacy chain is inconsistent: some policies wrap helper calls in a subquery (`( SELECT public.fn() AS fn )`, plan-cacheable), others call bare (`public.fn()`). Distinct from volatility. |
| Indexes on keep tables | **new** — reference DB (`pg_indexes` / `\d` on keep tables) | Not previously inventoried (Task 2's inventory has no "index" kind). Check: FK columns indexed, RLS-predicate columns indexed (e.g. `rls_organization_id`), redundant/overlapping indexes, coverage survives Task 3 renames (`meter_command_batches` etc.). |
| Trigger design overhead | Task 3c H1b (`append_rls_*` group) + H5 (all keep triggers) | Whether the `BEFORE INSERT` denormalization pattern is the right shape, or any function could be simplified/merged. |
| View definitions | Keep views (`002b-schema-inventory.md`) | e.g. `meters_with_account_and_statuses` — wide view, many joins; check plan shape. |

## Register

### Function volatility

| function | current | audited | register § | rationale | notes |
|----------|---------|---------|------------|-----------|-------|
| _(pending Task 3d)_ | | | | | |

### RLS policy invocation pattern

| policy | table | current pattern | audited pattern | register § | notes |
|--------|-------|-----------------|-----------------|------------|-------|
| _(pending Task 3d)_ | | | | | |

### Indexes

| table | index | action (keep / add / drop) | register § | rationale | notes |
|-------|-------|----------------------------|------------|-----------|-------|
| _(pending Task 3d)_ | | | | | |

### Triggers / views

| object | finding | action | register § | notes |
|--------|---------|--------|------------|-------|
| _(pending Task 3d)_ | | | | |

**Workflow:**

1. Enumerate indexes on keep tables from the reference DB (new — no prior inventory).
2. Audit function volatility against Task 3c's final keep-function list.
3. Audit RLS policy invocation patterns (`pg_policies`) for the bare-vs-subquery inconsistency.
4. Review trigger design (H1b group) and keep-view definitions.
5. Sync any resulting drop/add/change to `002b-schema-deviation-register.md` (new **Performance
   adjustments** section) with cutover implications.
6. Task 3d complete when every row above has a final action and the register is synced.
