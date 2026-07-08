# Schema Deviation Register

**Companion to:** `002b-database-baseline.md` (see parent plan `docs/plans/002-oss-migration.md`)
**Purpose:** the authoritative record of **every deviation of the OSS baseline schema from the
original (legacy-chain / company production) schema**. At company cutover, this register is the
spec for the convergence data migration that brings the company DB in line with the baseline.

**Rules:**

- One row per deviation. No deviation ships in the init migration without a row here.
- `Cutover implication` is mandatory: what must happen to the company production DB (drop X,
  rename Y, archive/relink Z, nothing) for it to converge on the baseline.
- Entries are appended/amended during 002b Task 3 (classification) and Task 6 (verification),
  and later by capability imports if they touch schema (they shouldn't — flag it if they do).
- Status: `candidate` (from ADRs, unconfirmed) → `confirmed` (maintainer sign-off) or
  `rejected` (kept in baseline after all; row stays for the record).

## Register

| # | Object(s) | Change | Rationale | Cutover implication | Status |
|---|---|---|---|---|---|
| 1 | `directives`, `lorawan-directives` tables + their enums | Exclude (deprecated) | Superseded by `meter-interactions`; retained in company DB only for historical `orders` references (ADR-004 decision 9, ADR-008) | Archive/relink historical `orders` references, then drop tables + enums | candidate |
| 2 | `grafana_readonly` role + its grants | Parameterize (company infra) | Company-specific observability access, not part of a generic baseline (ADR-004 decision 3) | None (role may stay in company DB); provide as optional documented SQL | candidate |
| 3 | `make_readonly` role + its grants | Parameterize (company infra) | Company-specific Make.com integration access (ADR-004 decision 3) | None (role may stay in company DB); provide as optional documented SQL | candidate |
| 4 | Tables/enums behind `一`-prefixed modules (`一demo`, `一directive-watchdog-sessions`, `一meter-credit-transfers`) — exact objects identified in 002b Task 2/3 | Drop (dead) | Modules are dead code; their schema is dead weight (ADR-008 Phase 2) | Drop the corresponding objects from company DB (verify no data worth archiving first) | candidate |

## Appendix — annotated A/B diff (002b Task 6)

> After the final verification pass, paste the old-vs-new schema diff here with each hunk
> annotated with its register entry number.

_(empty)_
