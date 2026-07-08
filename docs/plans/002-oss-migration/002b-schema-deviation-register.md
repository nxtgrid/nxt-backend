# Schema Deviation Register

**Companion to:** `002b-database-baseline.md` (see parent plan `docs/plans/002-oss-migration.md`)
**Purpose:** the authoritative record of **every deviation of the OSS baseline schema from the
original (legacy-chain / company production) schema**. At company cutover, this register is the
spec for the convergence data migration that brings the company DB in line with the baseline.

**Rules:**

- One row per deviation. No deviation ships in the init migration without a row here.
- **Column-level changes** on otherwise-**keep** tables (drop/rename/type change) are recorded in the
  **Column adjustments** section below — grouped under the register entry that motivates them, not
  as separate inventory rows.
- `Cutover implication` is mandatory: what must happen to the company production DB (drop X,
  rename Y, archive/relink Z, nothing) for it to converge on the baseline.
- Entries are appended/amended during 002b Task 3a (object classification), **Task 3b**
  (column review — see `002b-schema-column-adjustments.md`), and Task 6 (verification),
  and later by capability imports if they touch schema (they shouldn't — flag it if they do).
- Status: `candidate` (from ADRs, unconfirmed) → `confirmed` (maintainer sign-off) or
  `rejected` (kept in baseline after all; row stays for the record).

## Register

| # | Object(s) | Change | Rationale | Cutover implication | Status |
|---|---|---|---|---|---|
| 1 | **Exclude — deprecated directive command system:** tables `directives`, `lorawan_directives`; view `batch_commands`; enums `directive_direction`, `directive_error`, `directive_phase`, `directive_status`, `directive_type`, `directive_special_status`; sequence `lorawan_directives_id_seq`; triggers on deprecated tables; indexes on deprecated tables | Exclude (deprecated) | Superseded by `meter-interactions`; historical `orders` references (ADR-004 decision 9, ADR-008). `directive_batches` / `directive_batch_executions` **stay** (rename candidates). Live batch path uses `task_type` + `fs_command`, not `directive_type` | Archive/relink historical `orders` refs; then drop excluded objects. See column adjustments §1 | confirmed |
| 2 | `grafana_readonly` role + grants + 15 `TO grafana_readonly` RLS policies | Parameterize (company infra) | Company-specific observability access, not part of a generic baseline (ADR-004 decision 3) | None (may stay in company DB); operator recipe `docs/database/optional/grafana-readonly.sql` — not in `supabase/migrations/` | confirmed |
| 3 | `make_readonly` role + grants + 4 `TO make_readonly` RLS policies | Parameterize (company infra) | Company-specific Make.com read access (ADR-004 decision 3) | None (may stay in company DB); operator recipe `docs/database/optional/make-readonly.sql` — not in `supabase/migrations/` | confirmed |
| 5 | `snaplet_readonly_2` role + grants on `public` + `auth` | Parameterize (company infra) | Snaplet seeding tooling; not generic OSS infra | None (may stay in company DB); operator recipe `docs/database/optional/snaplet-readonly.sql` — not in `supabase/migrations/` | confirmed |
| 6 | `notify_make_about_*` functions (3) + triggers on `grids` (3) | Parameterize (company infra) | Make.com grid webhooks; Tier-3 integration (ADR-004) | None (may stay in company DB); operator recipe `docs/database/optional/make-grid-triggers.sql` — not in `supabase/migrations/` | confirmed |
| 4 | **Drop — dead `一`-prefixed modules:** table `directive_watchdog_sessions`, sequence `directive_watchdog_sessions_id_seq` (`一directive-watchdog-sessions`; `一demo` has no migration objects) | Drop (dead) | Module disabled/WIP; watchdog sessions only referenced from excluded directive tables (ADR-008 Phase 2) | Drop from company DB; no archive required | confirmed |
| 7 | **Exclude — deprecated meter credit transfers:** table `meter_credit_transfers`, enum `meter_credit_transfer_status_enum`, sequence `meter_credit_transfers_id_seq`, trigger `append_rls_organization_id_on_meter_credit_transfer_insert`, function `append_rls_organization_id_by_receiver_meter_id()` | Exclude (deprecated) | `一meter-credit-transfers` module disabled; superseded path absent from OSS baseline; historical `orders` references | Archive/relink historical `orders` refs; then drop excluded objects. See column adjustments §2 | confirmed |
| 8 | **Drop — abandoned onboarding feature flags:** tables `features`, `member_feature`; sequence `features_id_seq`; indexes on `member_feature`; 2 RLS policies on `features` | Drop (dead) | “Features seen” UX never shipped; pegasus integration commented out; no backend module | Drop from company DB; no archive required | confirmed |
| 9 | **Drop — legacy TypeORM migration ledger:** table `public.migrations`, sequence `migrations_id_seq` | Drop (dead) | Superseded by Supabase migrations (`legacy/supabase/migrations`); primary DB TypeORM has `synchronize: false` and no migration runner | Drop from company DB; no archive required | confirmed |
| 10 | **Rename — DCU → gateway terminology:** table `dcus` → `gateways`, sequence `dcus_id_seq` → `gateways_id_seq`; FK columns `dcu_id` → `gateway_id` on `meters`, `devices`, `metering_hardware_install_sessions`; `grids.are_all_dcus_online` → `are_all_gateways_online`, `are_all_dcus_under_high_load_threshold` → `are_all_gateways_under_high_load_threshold`; `get_grid_status()` return columns; view aliases `dcu_id` / `dcu_external_reference` → `gateway_id` / `gateway_external_reference`; function `append_rls_organization_id_by_dcu_id_or_meter_id` → `append_rls_organization_id_by_gateway_id_or_meter_id`; triggers `append_rls_organization_id_on_dcus_insert` → `…_on_gateways_insert`, `append_rls_organization_id_on_route_insert` → `append_rls_organization_id_on_router_insert`; indexes, policies, FK names, realtime publication renamed consistently | Rename | Brand-neutral OSS naming; fix `route`→`router` trigger typo | Company DB rename migration at cutover; code at platform-core + metering imports. See column adjustments §3 | confirmed |
| 11 | **Extensions — init migration adds only non-default required:** omit Supabase platform defaults (`pg_stat_statements`, `pgcrypto`, `supabase_vault`, `uuid-ossp`); omit advisor tooling (`hypopg`, `index_advisor`); omit `pg_graphql` (off by default on new hosted projects). **Include** `IF NOT EXISTS`: `postgis`, `pg_net`, `pgsodium`, `pgjwt` | Omit from init / drop | Supabase fresh image already enables core extensions (verified `supabase/postgres` schema-17); avoid redundant `CREATE EXTENSION` and stale version anxiety; `postgis` required for `geometry` columns | Company DB: no-op if extensions already present; vanilla Postgres adopters follow README extension prerequisites | confirmed |
| 12 | **Drop — generic device registry (device-data-sink):** tables `devices`, `device_types`, `device_logs`; sequences `devices_id_seq`, `device_types_id_seq`, `device_logs_id_seq`; function `append_rls_organization_id_by_device_id()`; triggers on `devices` / `device_logs`; RLS policies; realtime publication entries | Drop (dead) | Device-data-sink path removed from OSS scope (ADR-004); no active app usage; Grafana read policies only | Drop from company DB; drop `meters.device_id` FK/unique (see column adjustments §4) | confirmed |

## Column adjustments

Authoritative for init-migration column prunes on **keep** tables. **Working review copy:**
`002b-schema-column-adjustments.md` (Task 3b — one row per column; maintainer adds/removes drops
there, then confirmed rows are reflected here).

Grouped under the register entry that motivates them. Applied in the init migration on **keep**
tables; company DB converges at cutover.

### §1 — Motivated by register #1 (deprecated directive system)

| Table / view | Column(s) | Change | Rationale | Cutover / code impact |
|---|---|---|---|---|
| `orders` | `directive_id`, `lorawan_directive_id` (+ FKs, unique on `directive_id`) | Drop | Only referenced excluded directive tables | Archive/relink historical orders first |
| `directive_batches` | `directive_type` | Drop | Legacy; live code uses `task_type` + `fs_command` (DTO has no `directive_type`) | Drop column; TypeORM entity updated at metering import |
| `meters` | `current_special_status` | Drop | Shadow of deprecated directive status; `issues` table is canonical | Drop column; `issues.service` today reads this column — fix at metering import to use `issues` |
| `meters_with_account_and_statuses` | `current_special_status` (view column) | Drop from view definition | Follows `meters` column drop | Recreate view without column |

### §2 — Motivated by register #7 (deprecated meter credit transfers)

| Table / view | Column(s) | Change | Rationale | Cutover / code impact |
|---|---|---|---|---|
| `orders` | `meter_credit_transfer_id` (+ FK, unique `REL_a53c58bdb5ae0193f17497c81b`) | Drop | Only referenced excluded `meter_credit_transfers` | Archive/relink historical orders first; remove tiamat `produceMeterInteraction` branch, reporting meta check, TypeORM join/relation at payments import |

### §3 — Motivated by register #10 (DCU → gateway renames)

| Table / view | Column(s) | Change | Rationale | Cutover / code impact |
|---|---|---|---|---|
| `dcus` | (table) | Rename → `gateways` | Platform core naming | Rename table + sequence; TypeORM `Dcu` → `Gateway` at platform-core import |
| `meters` | `dcu_id` (+ FK, index) | Rename → `gateway_id` | FK to renamed table | Rename column; metering import |
| `devices` | `dcu_id` (+ FK) | Rename → `gateway_id` | FK to renamed table | Rename column; metering/production import |
| `metering_hardware_install_sessions` | `dcu_id` | Rename → `gateway_id` | FK to renamed table | Rename column; metering import |
| `grids` | `are_all_dcus_online`, `are_all_dcus_under_high_load_threshold` | Rename → `are_all_gateways_online`, `are_all_gateways_under_high_load_threshold` | Consistent gateway terminology | Rename columns; grid diagnostics import |
| `agents_with_account`, `customers_with_account`, `meters_with_account_and_statuses` | view columns `dcu_id`, `dcu_external_reference` | Rename → `gateway_id`, `gateway_external_reference` | Follows table rename | Recreate views |

### §4 — Motivated by register #12 (drop device registry)

| Table / view | Column(s) | Change | Rationale | Cutover / code impact |
|---|---|---|---|---|
| `meters` | `device_id` (+ FK, unique `meters_device_id_key`) | Drop | Only referenced dropped `devices` table | Drop column at cutover; metering import |
| `meters_with_account_and_statuses` | `device_id` (view column) | Drop from view definition | Follows `meters` column drop | Recreate view without column |

### §pending — Column prune backlog (Task 3a)

> Provisional drops flagged during object batches — **must be confirmed or removed in Task 3b**
> (`002b-schema-column-adjustments.md`). Examples: `meters.watchdog_session`,
> `meters.watchdog_last_run_at` (no app usage found; related to dropped watchdog sessions).

## Appendix — annotated A/B diff (002b Task 6)

> After the final verification pass, paste the old-vs-new schema diff here with each hunk
> annotated with its register entry number.

_(empty)_
