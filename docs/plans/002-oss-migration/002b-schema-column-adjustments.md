# Schema Column Adjustments (working review)

**Companion to:** `002b-database-baseline.md` — **Task 3b**
**Status:** Not started — generate after Task 3a (object batches) is complete.

## Purpose

One row per **column on every keep table/view**, for maintainer review before Task 5. This is
where you add or remove planned column drops (and flag renames).

| table | column | action | register § | rationale | notes |
|-------|--------|--------|------------|-----------|-------|
| _(pending Task 3b)_ | | | | | |

**Actions:** `keep` | `drop` | `rename`

**Workflow:**

1. Generate from reference DB (`information_schema.columns` on keep tables from inventory).
2. Pre-fill known drops from deviation register **Column adjustments** (e.g. §1).
3. Maintainer reviews table-by-table; edit actions here.
4. On sign-off: sync confirmed `drop`/`rename` rows to the register; Task 3 complete.

**Not in scope:** columns on excluded/dropped tables (those objects are gone entirely).
