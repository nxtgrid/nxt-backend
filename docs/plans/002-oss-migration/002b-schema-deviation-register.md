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
| 1 | **Exclude — deprecated directive command system:** tables `directives`, `lorawan_directives`; view `batch_commands`; enums `directive_direction`, `directive_error`, `directive_phase`, `directive_status`, `directive_type`, `directive_special_status`; sequence `lorawan_directives_id_seq`; triggers on deprecated tables; indexes on deprecated tables | Exclude (deprecated) | Superseded by `meter-interactions`; historical `orders` references (ADR-004 decision 9, ADR-008). `directive_batches` / `directive_batch_executions` **renamed** to `meter_task_batches` / `meter_task_batch_executions` (register #16). Live batch path uses `task_type` + `fs_command`, not `directive_type` | Archive/relink historical `orders` refs; then drop excluded objects. See column adjustments §1 | confirmed |
| 2 | `grafana_readonly` role + grants + 15 `TO grafana_readonly` RLS policies | Parameterize (company infra) | Company-specific observability access, not part of a generic baseline (ADR-004 decision 3) | None (may stay in company DB); operator recipe `docs/database/optional/grafana-readonly.sql` — not in `supabase/migrations/` | confirmed |
| 3 | `make_readonly` role + grants + 4 `TO make_readonly` RLS policies | Parameterize (company infra) | Company-specific Make.com read access (ADR-004 decision 3) | None (may stay in company DB); operator recipe `docs/database/optional/make-readonly.sql` — not in `supabase/migrations/` | confirmed |
| 5 | `snaplet_readonly_2` role + grants on `public` + `auth` | Parameterize (company infra) | Snaplet seeding tooling; not generic OSS infra | None (may stay in company DB); operator recipe `docs/database/optional/snaplet-readonly.sql` — not in `supabase/migrations/` | confirmed |
| 6 | `notify_make_about_*` functions (3) + triggers on `grids` (3) | Parameterize (company infra) | Make.com grid webhooks; Tier-3 integration (ADR-004) | None (may stay in company DB); operator recipe `docs/database/optional/make-grid-triggers.sql` — not in `supabase/migrations/` | confirmed |
| 4 | **Drop — dead `一`-prefixed modules:** table `directive_watchdog_sessions`, sequence `directive_watchdog_sessions_id_seq` (`一directive-watchdog-sessions`; `一demo` has no migration objects) | Drop (dead) | Module disabled/WIP; watchdog sessions only referenced from excluded directive tables (ADR-008 Phase 2) | Drop from company DB; no archive required | confirmed |
| 7 | **Exclude — deprecated meter credit transfers:** table `meter_credit_transfers`, enum `meter_credit_transfer_status_enum`, sequence `meter_credit_transfers_id_seq`, trigger `append_rls_organization_id_on_meter_credit_transfer_insert`, function `append_rls_organization_id_by_receiver_meter_id()` | Exclude (deprecated) | `一meter-credit-transfers` module disabled; superseded path absent from OSS baseline; historical `orders` references | Archive/relink historical `orders` refs; then drop excluded objects. See column adjustments §2 | confirmed |
| 8 | **Drop — abandoned onboarding feature flags:** tables `features`, `member_feature`; sequence `features_id_seq`; indexes on `member_feature`; 2 RLS policies on `features` | Drop (dead) | “Features seen” UX never shipped; pegasus integration commented out; no backend module | Drop from company DB; no archive required | confirmed |
| 9 | **Drop — legacy TypeORM migration ledger:** table `public.migrations`, sequence `migrations_id_seq` | Drop (dead) | Superseded by Supabase migrations (`legacy/supabase/migrations`); primary DB TypeORM has `synchronize: false` and no migration runner | Drop from company DB; no archive required | confirmed |
| 10 | **Rename — router insert trigger typo:** trigger `append_rls_organization_id_on_route_insert` → `append_rls_organization_id_on_router_insert` on `routers` | Rename | Legacy misname (`route` vs table `routers`); no semantic change | Company DB: `ALTER TRIGGER … RENAME` at cutover (or recreate in place); init migration uses corrected name | confirmed |
| 11 | **Extensions — init migration adds only non-default required:** omit Supabase platform defaults (`pg_stat_statements`, `pgcrypto`, `supabase_vault`, `uuid-ossp`); omit advisor tooling (`hypopg`, `index_advisor`); omit `pg_graphql` (off by default on new hosted projects). **Include** `IF NOT EXISTS`: `postgis`, `pg_net`, `pgsodium`, `pgjwt` | Omit from init / drop | Supabase fresh image already enables core extensions (verified `supabase/postgres` schema-17); avoid redundant `CREATE EXTENSION` and stale version anxiety; `postgis` required for `geometry` columns | Company DB: no-op if extensions already present; vanilla Postgres adopters follow README extension prerequisites | confirmed |
| 12 | **Drop — generic device registry (device-data-sink):** tables `devices`, `device_types`, `device_logs`; sequences `devices_id_seq`, `device_types_id_seq`, `device_logs_id_seq`; function `append_rls_organization_id_by_device_id()`; triggers on `devices` / `device_logs`; RLS policies; realtime publication entries | Drop (dead) | Device-data-sink path removed from OSS scope (ADR-004); no active app usage; Grafana read policies only | Drop from company DB; drop `meters.device_id` FK/unique (see column adjustments §4) | confirmed |
| 13 | **Drop — payouts module:** tables `payouts`, `bank_accounts`; enum `payout_status_enum`; sequences `payouts_id_seq`, `bank_accounts_id_seq`; function `lock_next_order()`; RLS policies on `payouts` / `bank_accounts` | Drop (dead) | Payouts module dropped from OSS scope; `bank_accounts` only used by `payouts`; `lock_next_order` superseded by `lock_next_order_and_wallets` | Drop from company DB; no archive required. Consider dropping `grids.is_automatic_payout_generation_enabled` in Task 3b | confirmed |
| 14 | **Drop — pd-hero workflow (WIP):** tables `pd_flows`, `pd_flow_templates`, `pd_sections`, `pd_section_templates`, `pd_actions`, `pd_action_templates`, `pd_documents`, `pd_document_templates`, `pd_audits`; enums `pd_action_status_enum`, `pd_action_type_enum`, `pd_document_type_enum`; sequences `pd_flows_id_seq`, `pd_flow_templates_id_seq`, `pd_sections_id_seq`, `pd_section_templates_id_seq`, `pd_actions_id_seq`, `pd_action_templates_id_seq`, `pd_documents_id_seq`, `pd_document_templates_id_seq`, `pd_audits_id_seq`; function `lock_next_pd_action()`; RLS policies on dropped tables | Drop (dead) | pd-hero Make.com/Google workflow under-developed; only `pd_sites` / `pd_site_submissions` kept for site pipeline. Likely replaced by different design | Drop from company DB; no archive required. See column adjustments §5 | confirmed |
| 15 | **Drop — autopilot execution log:** table `autopilot_executions`, sequence `autopilot_executions_id_seq`; RLS policies | Drop (deferred) | Autopilot deferred from OSS baseline; likely returns as separate microservice with its own persistence | Drop from company DB; no archive required | confirmed |
| 16 | **Rename — meter task batches:** tables `directive_batches` → `meter_task_batches`, `directive_batch_executions` → `meter_task_batch_executions`; sequences `directive_batches_id_seq` → `meter_task_batches_id_seq`, `directive_batch_executions_id_seq` → `meter_task_batch_executions_id_seq`; function `append_rls_organization_id_by_directive_batch_id()` → `append_rls_organization_id_by_meter_task_batch_id()`; triggers `append_rls_organization_id_on_directive_batch_insert` → `append_rls_organization_id_on_meter_task_batch_insert`, `append_rls_organization_id_on_directive_batch_execution_insert` → `append_rls_organization_id_on_meter_task_batch_execution_insert`; FK `meter_interactions.batch_execution_id` → `meter_task_batch_executions` | Rename | Legacy `directive_*` naming from deprecated directive system; live path is meter-interactions / task batches | Company DB: `ALTER TABLE … RENAME` (+ sequence/function/trigger renames); init migration uses new names. See column adjustments §6 | confirmed |

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
| `meter_task_batches` (was `directive_batches`) | `directive_type` | Drop | Legacy; live code uses `task_type` + `fs_command` (DTO has no `directive_type`) | Drop column; TypeORM entity updated at metering import |
| `meters` | `current_special_status` | Drop | Shadow of deprecated directive status; `issues` table is canonical | Drop column; `issues.service` today reads this column — fix at metering import to use `issues` |
| `meters_with_account_and_statuses` | `current_special_status` (view column) | Drop from view definition | Follows `meters` column drop | Recreate view without column |

### §2 — Motivated by register #7 (deprecated meter credit transfers)

| Table / view | Column(s) | Change | Rationale | Cutover / code impact |
|---|---|---|---|---|
| `orders` | `meter_credit_transfer_id` (+ FK, unique `REL_a53c58bdb5ae0193f17497c81b`) | Drop | Only referenced excluded `meter_credit_transfers` | Archive/relink historical orders first; remove tiamat `produceMeterInteraction` branch, reporting meta check, TypeORM join/relation at payments import |

### §4 — Motivated by register #12 (drop device registry)

| Table / view | Column(s) | Change | Rationale | Cutover / code impact |
|---|---|---|---|---|
| `meters` | `device_id` (+ FK, unique `meters_device_id_key`) | Drop | Only referenced dropped `devices` table | Drop column at cutover; metering import |
| `meters_with_account_and_statuses` | `device_id` (view column) | Drop from view definition | Follows `meters` column drop | Recreate view without column |

### §5 — Motivated by register #14 (drop pd-hero workflow)

| Table / view | Column(s) | Change | Rationale | Cutover / code impact |
|---|---|---|---|---|
| `pd_sites` | `pd_flow_id` (+ FK to `pd_flows`) | Drop | Only referenced dropped pd-hero workflow tables; sites kept for pipeline/geo | Drop column at cutover; pegasus `PdSiteView` pd-flow actions UI removed or reworked at field-ops import |

### §6 — Motivated by register #16 (meter task batch renames)

| Table / view | Column(s) | Change | Rationale | Cutover / code impact |
|---|---|---|---|---|
| `meter_task_batch_executions` (was `directive_batch_executions`) | `directive_batch_id` (+ FK to `meter_task_batches`) | Rename → `meter_task_batch_id` | Align column name with renamed parent table | `ALTER TABLE … RENAME COLUMN` at cutover; TypeORM entity updated at metering import |

### §pending — Column prune backlog (Task 3a)

> Provisional drops flagged during object batches — **must be confirmed or removed in Task 3b**
> (`002b-schema-column-adjustments.md`). Examples: `meters.watchdog_session`,
> `meters.watchdog_last_run_at` (no app usage found; related to dropped watchdog sessions).
> `grids.is_automatic_payout_generation_enabled` (payouts module dropped; register #13).

## Appendix — annotated A/B diff (002b Task 6)

> After the final verification pass, paste the old-vs-new schema diff here with each hunk
> annotated with its register entry number.

_(empty)_
