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
  (column review — see `002b-schema-column-adjustments.md`), **Task 3c** (programmability —
  see `002b-schema-programmability-review.md`), and Task 6 (verification),
  and later by capability imports if they touch schema (they shouldn't — flag it if they do).
- Status: `candidate` (from ADRs, unconfirmed) → `confirmed` (maintainer sign-off) or
  `rejected` (kept in baseline after all; row stays for the record).

## Register

| # | Object(s) | Change | Rationale | Cutover implication | Status |
|---|---|---|---|---|---|
| 1 | **Exclude — deprecated directive command system:** tables `directives`, `lorawan_directives`; view `batch_commands`; enums `directive_direction`, `directive_error`, `directive_phase`, `directive_status`, `directive_type`, `directive_special_status`; sequence `lorawan_directives_id_seq`; triggers on deprecated tables; indexes on deprecated tables | Exclude (deprecated) | Superseded by `meter-interactions`; historical `orders` references (ADR-004 decision 9, ADR-008). `directive_batches` / `directive_batch_executions` **renamed** to `meter_command_batches` / `meter_command_batch_executions` (register #16). Live batch path uses `task_type` + `fs_command`, not `directive_type` | Archive/relink historical `orders` refs; then drop excluded objects. See column adjustments §1 | confirmed |
| 2 | `grafana_readonly` role + grants + 15 `TO grafana_readonly` RLS policies | Parameterize (company infra) | Company-specific observability access, not part of a generic baseline (ADR-004 decision 3) | None (may stay in company DB); operator recipe `docs/database/optional/grafana-readonly.sql` — not in `supabase/migrations/` | confirmed |
| 3 | `make_readonly` role + grants + 4 `TO make_readonly` RLS policies | Parameterize (company infra) | Company-specific Make.com read access (ADR-004 decision 3) | None (may stay in company DB); operator recipe `docs/database/optional/make-readonly.sql` — not in `supabase/migrations/` | confirmed |
| 5 | `snaplet_readonly_2` role + grants on `public` + `auth` | Parameterize (company infra) | Snaplet seeding tooling; not generic OSS infra | None (may stay in company DB); operator recipe `docs/database/optional/snaplet-readonly.sql` — not in `supabase/migrations/` | confirmed |
| 6 | `notify_make_about_*` functions (3) + triggers on `grids` (3) | Parameterize (company infra) | Make.com grid webhooks; Tier-3 integration (ADR-004) | None (may stay in company DB); operator recipe `docs/database/optional/make-grid-triggers.sql` — not in `supabase/migrations/` | confirmed |
| 4 | **Drop — dead `一`-prefixed modules:** table `directive_watchdog_sessions`, sequence `directive_watchdog_sessions_id_seq` (`一directive-watchdog-sessions`; `一demo` has no migration objects) | Drop (dead) | Module disabled/WIP; watchdog sessions only referenced from excluded directive tables (ADR-008 Phase 2) | Drop from company DB; drop `meters.watchdog_session`, `meters.watchdog_last_run_at` (column adjustments §4b) | confirmed |
| 7 | **Exclude — deprecated meter credit transfers:** table `meter_credit_transfers`, enum `meter_credit_transfer_status_enum`, sequence `meter_credit_transfers_id_seq`, trigger `append_rls_organization_id_on_meter_credit_transfer_insert`, function `append_rls_organization_id_by_receiver_meter_id()` | Exclude (deprecated) | `一meter-credit-transfers` module disabled; superseded path absent from OSS baseline; historical `orders` references | Archive/relink historical `orders` refs; then drop excluded objects. See column adjustments §2 | confirmed |
| 8 | **Drop — abandoned onboarding feature flags:** tables `features`, `member_feature`; sequence `features_id_seq`; indexes on `member_feature`; 2 RLS policies on `features` | Drop (dead) | “Features seen” UX never shipped; pegasus integration commented out; no backend module | Drop from company DB; no archive required | confirmed |
| 9 | **Drop — legacy TypeORM migration ledger:** table `public.migrations`, sequence `migrations_id_seq` | Drop (dead) | Superseded by Supabase migrations (`legacy/supabase/migrations`); primary DB TypeORM has `synchronize: false` and no migration runner | Drop from company DB; no archive required | confirmed |
| 10 | **Rename — router insert trigger typo:** trigger `append_rls_organization_id_on_route_insert` → `append_rls_organization_id_on_router_insert` on `routers` | Rename | Legacy misname (`route` vs table `routers`); no semantic change | Company DB: `ALTER TRIGGER … RENAME` at cutover (or recreate in place); init migration uses corrected name | confirmed |
| 11 | **Extensions — init migration adds only non-default required:** omit Supabase platform defaults (`pg_stat_statements`, `pgcrypto`, `supabase_vault`, `uuid-ossp`); omit advisor tooling (`hypopg`, `index_advisor`); omit `pg_graphql` (off by default on new hosted projects); omit `pgjwt` (drop — see rationale). **Include** `IF NOT EXISTS`: `postgis`, `pg_net`, `pgsodium` | Omit from init / drop | Supabase fresh image already enables core extensions (verified `supabase/postgres` schema-17); avoid redundant `CREATE EXTENSION` and stale version anxiety; `postgis` required for `geometry` columns. **`pgjwt` dropped (amended 2026-07-10):** not available on Postgres 17 at all (Supabase removed it from the PG17 image bundle, alongside `timescaledb`/`plv8`/`plcoffee`/`plls`) — `CREATE EXTENSION IF NOT EXISTS "pgjwt"` would error outright on any PG17 project. Confirmed dead weight regardless: grepped the full legacy migration chain and all app code for its functions (`sign`/`verify`/`url_encode`/`url_decode`/`algorithm_sign`) — zero usage beyond the bare `CREATE EXTENSION` line. Matches Supabase's own guidance ("if you weren't explicitly using pgjwt... it's most likely safe to disable") | Company DB: no-op if extensions already present; vanilla Postgres adopters follow README extension prerequisites. `pgjwt`: drop from company DB at cutover (confirmed unused — no functional loss) | confirmed |
| 12 | **Drop — generic device registry (device-data-sink):** tables `devices`, `device_types`, `device_logs`; sequences `devices_id_seq`, `device_types_id_seq`, `device_logs_id_seq`; function `append_rls_organization_id_by_device_id()`; triggers on `devices` / `device_logs`; RLS policies; realtime publication entries | Drop (dead) | Device-data-sink path removed from OSS scope (ADR-004); no active app usage; Grafana read policies only | Drop from company DB; drop `meters.device_id` FK/unique (see column adjustments §4) | confirmed |
| 13 | **Drop — payouts module:** tables `payouts`, `bank_accounts`; enum `payout_status_enum`; sequences `payouts_id_seq`, `bank_accounts_id_seq`; function `lock_next_order()`; RLS policies on `payouts` / `bank_accounts` | Drop (dead) | Payouts module dropped from OSS scope; `bank_accounts` only used by `payouts`; `lock_next_order` superseded by `lock_next_order_and_wallets` | Drop from company DB; drop `grids.is_automatic_payout_generation_enabled` (column adjustments §3) | confirmed |
| 14 | **Drop — pd-hero workflow (WIP):** tables `pd_flows`, `pd_flow_templates`, `pd_sections`, `pd_section_templates`, `pd_actions`, `pd_action_templates`, `pd_documents`, `pd_document_templates`, `pd_audits`; enums `pd_action_status_enum`, `pd_action_type_enum`, `pd_document_type_enum`; sequences `pd_flows_id_seq`, `pd_flow_templates_id_seq`, `pd_sections_id_seq`, `pd_section_templates_id_seq`, `pd_actions_id_seq`, `pd_action_templates_id_seq`, `pd_documents_id_seq`, `pd_document_templates_id_seq`, `pd_audits_id_seq`; function `lock_next_pd_action()`; RLS policies on dropped tables | Drop (dead) | pd-hero Make.com/Google workflow under-developed; only `pd_sites` / `pd_site_submissions` kept for site pipeline. Likely replaced by different design | Drop from company DB; drop `pd_sites.pd_flow_id`, `organizations.pd_hero_google_drive_folder_id` (column adjustments §5) | confirmed |
| 15 | **Drop — autopilot execution log:** table `autopilot_executions`, sequence `autopilot_executions_id_seq`; RLS policies | Drop (deferred) | Autopilot deferred from OSS baseline; likely returns as separate microservice with its own persistence | Drop from company DB; drop `grids.telegram_response_path_autopilot` (column adjustments §15) | confirmed |
| 16 | **Rename — meter command batches:** tables `directive_batches` → `meter_command_batches`, `directive_batch_executions` → `meter_command_batch_executions`; sequences `directive_batches_id_seq` → `meter_command_batches_id_seq`, `directive_batch_executions_id_seq` → `meter_command_batch_executions_id_seq`; indexes `idx_directive_batches_rls_organization_id` → `idx_meter_command_batches_rls_organization_id`, `idx_directive_batch_executions_rls_organization_id` → `idx_meter_command_batch_executions_rls_organization_id`; function `append_rls_organization_id_by_directive_batch_id()` → `append_rls_organization_id_by_meter_command_batch_id()`; triggers `append_rls_organization_id_on_directive_batch_insert` → `append_rls_organization_id_on_meter_command_batch_insert`, `append_rls_organization_id_on_directive_batch_execution_insert` → `append_rls_organization_id_on_meter_command_batch_execution_insert`; FK `meter_interactions.batch_execution_id` → `meter_command_batch_executions`; column `directive_batch_id` → `meter_command_batch_id` on executions table | Rename | Legacy `directive_*` naming from deprecated directive system; live path is meter-interactions / command batches | Company DB: `ALTER TABLE … RENAME` (+ sequence/index/function/trigger renames); init migration uses new names. See column adjustments §6 | confirmed |
| 17 | **Column prunes — platform core (Task 3b G1):** `organizations.phone`, `organizations.address`, `api_keys.is_locked`, `dcus.queue_buffer_length`, `grids.are_all_dcus_online`, `grids.are_all_dcus_under_high_load_threshold`, `grids.meter_consumption_issue_threshold_detection_days`, `grids.meter_communication_issue_threshold_detection_days`, `grids.uses_dual_meter_setup` | Drop columns | Maintainer sign-off 2026-07-09 — unused or superseded in OSS baseline | Drop columns at cutover; platform-core import updates entities/DTOs | confirmed |
| 18 | **Column prunes — metering (Task 3b G2):** `directive_batches.lock_session`, `directive_batches.execution_bucket`, `meter_commissionings.initialised_steps` / `pending_steps` / `processing_steps` / `successful_steps` / `failed_steps` / `total_steps`, `meter_commissionings.lock_session`, `meters.power_down_count`, `meters.power_down_count_updated_at`, `meters.is_simulated`, `meters.pulse_counter_kwh`, `meters.pulse_counter_kwh_updated_at` (+ matching view columns on `meters_with_account_and_statuses`) | Drop columns | Maintainer sign-off 2026-07-09 — unused or superseded in OSS baseline | Drop columns at cutover; metering import updates entities/DTOs and view definition | confirmed |
| 19 | **Column prunes — payments + production monitoring (Task 3b G3):** `wallets.goldring_migration_id`, `orders.external_system` | Drop columns | Maintainer sign-off 2026-07-09 — migration-era / unused in OSS baseline | Drop columns at cutover; payments import updates order/wallet entities | confirmed |
| 20 | **Column changes — notifications + field ops (Task 3b G4):** `issues.external_system` → `external_tracking_system`, `issues.external_reference` → `external_tracking_reference`; drop `issues.estimated_lost_revenue`, `issues.snoozed_until`, `issues.mppt_id`, `issues.grid_id` | Rename + drop columns | Maintainer sign-off 2026-07-09 — clarify external tracking naming; prune unused issue columns | `ALTER TABLE … RENAME COLUMN` + drops at cutover; field-ops import updates issue entity/DTO | confirmed |
| 21 | **Drop — orphan RLS helper:** function `append_rls_organization_id_by_historical_grid_id()` | Drop (dead) | Task 3c H1a — no trigger in migration chain; `orders.historical_grid_id` set in app (`tiamat/order-meta.ts`); `transactions` use `append_rls_organization_id_by_order_id()` instead | Drop function from company DB at cutover (no-op if already unused); omit from init migration | confirmed |
| 22 | **Rename + redesign — admin organization becomes DB-native:** function `rls_check_if_nxt_member()` → `rls_check_if_admin_org_member()` (reads `PLATFORM_OPERATOR` org via indexed lookup, `LANGUAGE sql STABLE`); **add** enum value `organization_type_enum.PLATFORM_OPERATOR`; **add** partial unique index `one_platform_operator_org` on `organizations`. *(Amended 2026-07-13 Task 8: GUC + `sync_admin_organization_id_guc` trigger dropped — Supabase migrations run as non-superuser `postgres`; `ALTER DATABASE … SET` for custom GUCs is not viable.)* | Rename + redesign + add | Task 3c H1a/H1c — RLS cannot read the app config (`getConfig().deployment.adminOrganizationId`, ADR-007 decision 1/10); admin org must be DB-native. Full rationale: ADR-007 Amendment (2026-07-09), implementation amended 2026-07-13 | Company DB at cutover: add enum value + index; flag NXT Grid's organization row `organization_type = 'PLATFORM_OPERATOR'`; update RLS policies to `rls_check_if_admin_org_member()`; post-migration bootstrap per `docs/deployment/supabase.md` §5; app-side `getConfig().deployment.adminOrganizationId` consumers **not yet migrated** — open in ADR-007 | confirmed |
| 23 | **Redesign — `append_rls_*` trigger functions consolidated onto shared helpers:** 10 functions (`append_rls_organization_id_by_account_id/grid_id/connection_id/customer_id/customer_id_or_agent_id_or_connec/dcu_id_or_meter_id/directive_batch_id/meter_id/metering_hardware_install_session/order_id`) redesigned to delegate to **6 new** helper functions (`rls_org_id_from_grid/customer/connection/agent/meter/dcu`); dead join to `organizations` removed from `by_account_id()`; second dead lookup removed from the `organization_id` branch of `by_customer_id_or_agent_id_or_connec()`; `SET search_path TO ''` added to all 10 (9 were missing it) | Redesign + add | Task 3c H1b — same denormalize-via-trigger strategy kept (correct for read-heavy RLS), but join logic was duplicated near-verbatim across several functions (e.g. meter→connection→customer→grid appears 3×); consolidating removes duplication with no runtime cost (`LANGUAGE sql STABLE` helpers are inlining-eligible). `search_path` fix addresses Supabase "Function Search Path Mutable" linter warning | Company DB at cutover: `CREATE FUNCTION` the 6 helpers; `CREATE OR REPLACE FUNCTION` the 10 trigger functions with new bodies (same names/signatures/trigger wiring — no `ALTER TRIGGER` needed except the already-recorded #16 rename). See Programmability adjustments §4 | confirmed |
| 24 | **Harden — `lock_next_order_and_wallets()` search_path:** add `SET search_path TO ''` | Harden | Task 3c H1b spillover + H3 logic review — "Function Search Path Mutable" linter fix; function logic confirmed **keep** (atomic `FOR UPDATE SKIP LOCKED` payment lock, supersedes dropped `lock_next_order()`) | Company DB at cutover: `CREATE OR REPLACE FUNCTION` with `SET search_path TO ''` added; no behavior change | confirmed |
| 25 | **Add index — `idx_accounts_organization_id`** on `accounts(organization_id)` | Add index | Task 3c H1b — found while tracing RLS index coverage for register #23; `accounts` has 2 RLS policies (`Allow org member to select`, `Allow org members to update`) filtering directly on `organization_id`, but (unlike every other RLS-filtered org column in the schema) had no supporting index | Company DB: `CREATE INDEX IF NOT EXISTS` at cutover (no-op if already present); init migration includes it from the start | confirmed |
| 26 | **Redesign — `get_grid_status(grid_id)` return type:** drop `are_all_dcus_online` and `are_all_dcus_under_high_load_threshold` from `RETURNS TABLE`; mark function **`STABLE`** | Redesign | Task 3c H2 — columns dropped from `grids` in register #17; function still selected them (init migration would fail). Pegasus already fetches gateway status via separate `dcus` query; UI usage of RPC columns commented out. `STABLE` marking: read-only RPC, same fix-when-it-surfaces principle as H1c/H1b | Company DB at cutover: `CREATE OR REPLACE FUNCTION` with narrowed return type + `STABLE`; pegasus supabase types at production-monitoring import | confirmed |
| 27 | **Harden + fix — payments reporting RPCs:** `find_energy_topup_revenue()` marked **`STABLE`**; `find_top_spenders()` marked **`STABLE`** + `GROUP BY` narrowed to `meta_receiver_id_part_2`, `meta_receiver_name_part_2` only (drop `meta_receiver_id`/meter — fixes customer split across meters) | Harden + fix | Task 3c H3 — read-only RPCs should be `STABLE`; legacy `GROUP BY` included meter id so one customer with multiple meters appeared as separate partial rows in top-spender rankings (loch revenue reports) | Company DB at cutover: `CREATE OR REPLACE FUNCTION` both; no app code change required (return shape unchanged) | confirmed |
| 28 | **Enum value trim — `external_system_enum`:** drop values `JOTFORM`, `STEAMACO`, `ACREL` (keep 11 incl. `JIRA`) | Drop enum values | Task 3c H4a — unused/dead integrations; `JIRA` **kept** (required by `issues.external_tracking_system`, register #20 — same enum type, DB default `'JIRA'`) | Company DB at cutover: verify no rows reference dropped values on any `external_system_enum` column (dcus, meters, grids, issues, notifications, …); migrate/archive if found; init migration creates trimmed enum | confirmed |
| 29 | **Enum value trim — `notification_type_enum`:** drop value `AUTO_PAYOUT_GENRATION_REPORT` (keep 15) | Drop enum value | Task 3c H4d — payouts module dropped (register #13); only producer was dropped `loch/payouts.service` | Company DB at cutover: verify no `notifications.notification_type = 'AUTO_PAYOUT_GENRATION_REPORT'` rows (archive if found); init migration creates trimmed enum | confirmed |
| 30 | **Add indexes — D1 FK/RLS coverage sweep:** 47 new indexes on keep tables — 3 RLS-predicate/renamed-FK gaps (`idx_grids_organization_id`, `idx_metering_hardware_imports_rls_organization_id`, `idx_meter_command_batch_executions_meter_command_batch_id`) + 44 plain FK-column indexes across `agents`, `api_keys`, `audits` (8), `connection_requested_meters`, `dcus`, `energy_cabins`, `meter_command_batches` (2), `meter_commissionings`, `metering_hardware_imports` (1 more), `metering_hardware_install_sessions` (3), `meters.pole_id`, `mppts`, `notes` (4), `notifications` (4), `orders` (3), `pd_site_submissions`, `pd_sites` (2), `poles`, `routers`, `transactions`, `ussd_session_hops`, `ussd_sessions` (3). Full per-column list + rationale: `002b-schema-performance-audit.md` Indexes § Gap findings | Add index | Task 3d D1 — systematic FK/RLS-predicate index coverage sweep across all 35 keep tables. Tier 1 mirrors register #25 (RLS-predicate/FK column with no supporting index, same class of gap); Tier 2 is standard "index every FK" hygiene — largely absent except on `rls_organization_id`-style denormalized columns. Reviewed and excluded: 2 columns with no current read/RLS usage (`members.busy_commissioning_id`, `meters.rls_grid_id` — Performance adjustments §1 notes) and 2 orders partial/full index pairs confirmed intentional, not redundant | Company DB at cutover: `CREATE INDEX IF NOT EXISTS` for all 47 (no-op if already present); init migration includes them from the start | confirmed |
| 31 | **Mark `STABLE` — D2 remaining RLS-helper volatility:** `rls_check_if_lender()`, `rls_get_member_org_id()` | Harden (volatility) | Task 3d D2 — both are single-statement `auth.jwt()` reads with no side effects, same shape as `rls_check_if_admin_org_member()` (register #22, already `STABLE`). Every other keep function's volatility was already decided in Task 3c (H1b/H1c/H2/H3) — these 2 were the only ones left. `rls_get_member_org_id()` is the single most-invoked RLS helper in the schema (~24 policies across ~20 keep tables); `rls_check_if_lender()` used in 4. Full analysis: `002b-schema-performance-audit.md` Function volatility § D2 | Company DB at cutover: `CREATE OR REPLACE FUNCTION` both with `STABLE` added; no behavior change; both already have `SECURITY DEFINER` + `SET search_path TO ''` | confirmed |
| 32 | **Normalize RLS policy invocation pattern — D3:** wrap 18 bare helper-function calls in `( SELECT public.fn() AS fn )` — 14 × `rls_check_if_admin_org_member()` on `grids`/`meters`/`notes`/`organizations`/`pd_sites`/`poles`/`wallets` ("Allow NXT Grid to insert" `WITH CHECK`) and `accounts`/`connections`/`grids`/`meters`/`organizations`/`pd_site_submissions`/`pd_sites` ("Allow NXT Grid to update" `USING`); 4 × `rls_get_member_org_id()` on `notes`/`poles` ("Allow org members to insert" `WITH CHECK`) and `accounts`/`orders` ("Allow org members to update" `USING`) | Rewrite policy clause | Task 3d D3 — parsed all 123 `CREATE POLICY` statements (single migration, never altered later); found 69 helper-function calls across keep-table policies, 51 already wrapped (the Postgres/Supabase-recommended `InitPlan`-cacheable pattern) and 18 bare. Clean split: every bare call is on `INSERT`/`WITH CHECK` or `UPDATE`/`USING` — zero on `SELECT` (all 26 `SELECT`-side calls already wrapped). Normalizing removes the inconsistency and closes the bulk-`UPDATE` per-row-reevaluation gap; pairs with register #31 (`STABLE`), which is what makes the wrap's caching valid. Full list: `002b-schema-performance-audit.md` RLS policy invocation pattern § D3 | Company DB at cutover: `ALTER POLICY`/recreate the 18 policies with the wrapped clause; no behavior change (same boolean result), read-path performance only | confirmed |
| 33 | **Data API grants — keep explicit per-object grants; omit auto-expose default:** init migration carries forward `GRANT ALL ON TABLE/SEQUENCE/FUNCTION … TO "anon"/"authenticated"/"service_role"` for every **keep** table/sequence/function (mirrors the legacy dump, keep-bucket scope only); **omits** the 3 `ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES/SEQUENCES/FUNCTIONS TO "anon"/"authenticated"/"service_role"` statements | Keep (explicit) + omit (default-privileges) | Found during final Task 3d wrap-up sanity check: Supabase changed platform defaults — new projects created on/after 2026-05-30 no longer auto-grant `anon`/`authenticated`/`service_role` access to `public` tables (PostgREST returns `42501 permission denied` without an explicit `GRANT`, before RLS is even evaluated); enforced on all existing projects from 2026-10-30 (new tables added after that date, on any project). Explicit per-object grants on keep objects make the baseline self-contained — reachable via the Data API regardless of the project-creation toggle, local vs. hosted vs. self-hosted vanilla Postgres. Omitting the default-privileges statements is a deliberate choice to align with Supabase's now-recommended pattern (explicit `GRANT` + RLS + policy as one reviewable unit per migration) rather than re-introduce the auto-expose-everything default the platform itself is moving away from. Production's 57 existing tables are unaffected either way — grandfathered permanently per Supabase's changelog; this only governs objects added going forward | Company DB: no-op (existing grants/default-privileges setup untouched — this deviation only shapes the OSS baseline template, not company production). Adopters and 002c capability imports must add explicit `GRANT` statements for any new `public` table going forward — no ambient default; Task 9.2 verifies a keep table is actually reachable via the Data API on a fresh hosted project | confirmed |
| 34 | **FK cycle hardening — add `ON DELETE SET NULL` to 5 denormalized "latest pointer" FKs:** `meters.last_metering_hardware_install_session_id` → `metering_hardware_install_sessions.id`; `metering_hardware_install_sessions.last_metering_hardware_import_id` → `metering_hardware_imports.id`; `metering_hardware_install_sessions.last_meter_commissioning_id` → `meter_commissionings.id`; `dcus.last_metering_hardware_install_session_id` → `metering_hardware_install_sessions.id`; `meters.last_encountered_issue_id` → `issues.id` | Harden (`ON DELETE`) | Found during final sanity wrap-up (item 4/4): systematic FK-cycle sweep across all 35 keep tables found exactly **5 direct 2-cycles** (no cycles of length 3+) — each a denormalized "latest child" pointer column (`last_X_id`) paired with the child's own structural back-reference to its parent. Confirmed legitimate, not redundant: `dcus.service.ts` explicitly comments "we have a dcu property point at the latest dcu session, so it's easily retrievable"; the pattern is read throughout `meters_with_account_and_statuses` (chains 4 of the 5 cycles in one view), PostgREST embeds, and a TypeORM `@OneToOne`. Both sides of every cycle are already indexed (forward pointers via pre-existing `UNIQUE` constraints; structural back-pointers via register #30/Task 3d D1) — the query-efficiency half of the concern is already resolved. The real gap: all 10 FKs in these cycles default to `NO ACTION`, so deleting a row on either side while still referenced fails outright — matches the "hard to delete" pain reported. A full `legacy/` codebase sweep found **zero** hard-deletes (`.delete()`/`DELETE FROM`/`.remove()`) against any table — every removal is a soft-delete or status transition — so this isn't live-impacting today, but is a latent trap for future/manual/ops-level deletes. Fix scoped to the 5 *forward* pointers only; the 5 structural back-pointers correctly stay `NO ACTION` (a child row should not silently lose its real parent reference) | Company DB at cutover: drop + recreate each of the 5 FKs with `ON DELETE SET NULL` (no data impact — existing rows unaffected; changes only what happens on a future `DELETE`, which nothing currently triggers). See FK design adjustments §1 | confirmed |

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
| `meter_command_batches` (was `directive_batches`) | `directive_type` | Drop | Legacy; live code uses `task_type` + `fs_command` (DTO has no `directive_type`) | Drop column; TypeORM entity updated at metering import |
| `meters` | `current_special_status` | Drop | Shadow of deprecated directive status; `issues` table is canonical | Drop column; `issues.service` today reads this column — fix at metering import to use `issues` |
| `meters_with_account_and_statuses` | `current_special_status` (view column) | Drop from view definition | Follows `meters` column drop | Recreate view without column |

### §2 — Motivated by register #7 (deprecated meter credit transfers)

| Table / view | Column(s) | Change | Rationale | Cutover / code impact |
|---|---|---|---|---|
| `orders` | `meter_credit_transfer_id` (+ FK, unique `REL_a53c58bdb5ae0193f17497c81b`) | Drop | Only referenced excluded `meter_credit_transfers` | Archive/relink historical orders first; remove tiamat `produceMeterInteraction` branch, reporting meta check, TypeORM join/relation at payments import |

### §3 — Motivated by register #13 (drop payouts module)

| Table / view | Column(s) | Change | Rationale | Cutover / code impact |
|---|---|---|---|---|
| `grids` | `is_automatic_payout_generation_enabled` | Drop | Payouts module dropped; toggle has no live path | Drop column at cutover; remove from grid entity/DTO at platform-core import |

### §4 — Motivated by register #12 (drop device registry)

| Table / view | Column(s) | Change | Rationale | Cutover / code impact |
|---|---|---|---|---|
| `meters` | `device_id` (+ FK, unique `meters_device_id_key`) | Drop | Only referenced dropped `devices` table | Drop column at cutover; metering import |
| `meters_with_account_and_statuses` | `device_id` (view column) | Drop from view definition | Follows `meters` column drop | Recreate view without column |

### §4b — Motivated by register #4 (watchdog sessions dropped)

| Table / view | Column(s) | Change | Rationale | Cutover / code impact |
|---|---|---|---|---|
| `meters` | `watchdog_session`, `watchdog_last_run_at` | Drop | Watchdog module dropped; columns commented out in entity | Drop columns at cutover; metering import |
| `meters_with_account_and_statuses` | `watchdog_session`, `watchdog_last_run_at` (view columns) | Drop from view definition | Follows `meters` column drop | Recreate view without columns |

### §5 — Motivated by register #14 (drop pd-hero workflow)

| Table / view | Column(s) | Change | Rationale | Cutover / code impact |
|---|---|---|---|---|
| `pd_sites` | `pd_flow_id` (+ FK to `pd_flows`) | Drop | Only referenced dropped pd-hero workflow tables; sites kept for pipeline/geo | Drop column at cutover; pegasus `PdSiteView` pd-flow actions UI removed or reworked at field-ops import |
| `organizations` | `pd_hero_google_drive_folder_id` | Drop | Only used by dropped pd-hero service (`loch/pd-hero`) | Drop column at cutover; remove from organization entity at platform-core import |

### §6 — Motivated by register #16 (meter command batch renames)

| Table / view | Column(s) | Change | Rationale | Cutover / code impact |
|---|---|---|---|---|
| `meter_command_batch_executions` (was `directive_batch_executions`) | `directive_batch_id` (+ FK to `meter_command_batches`) | Rename → `meter_command_batch_id` | Align column name with renamed parent table | `ALTER TABLE … RENAME COLUMN` at cutover; TypeORM entity updated at metering import |

### §7 — Motivated by register #17 (platform core column prunes, Task 3b G1)

| Table / view | Column(s) | Change | Rationale | Cutover / code impact |
|---|---|---|---|---|
| `organizations` | `phone`, `address` | Drop | Unused in OSS baseline | Drop columns at cutover; organization entity/DTO at platform-core import |
| `api_keys` | `is_locked` | Drop | Unused in OSS baseline | Drop column at cutover; api_keys entity at platform-core import |
| `dcus` | `queue_buffer_length` | Drop | Unused in OSS baseline | Drop column at cutover; dcu entity at platform-core import |
| `grids` | `are_all_dcus_online`, `are_all_dcus_under_high_load_threshold`, `meter_consumption_issue_threshold_detection_days`, `meter_communication_issue_threshold_detection_days`, `uses_dual_meter_setup` | Drop | Unused or superseded in OSS baseline | Drop columns at cutover; grid entity/DTO at platform-core import |

### §15 — Motivated by register #15 (autopilot deferred)

| Table / view | Column(s) | Change | Rationale | Cutover / code impact |
|---|---|---|---|---|
| `grids` | `telegram_response_path_autopilot` | Drop | Autopilot deferred; column only in types/entity | Drop column at cutover; grid entity at platform-core import |

### §8 — Motivated by register #18 (metering column prunes, Task 3b G2)

| Table / view | Column(s) | Change | Rationale | Cutover / code impact |
|---|---|---|---|---|
| `meter_command_batches` (was `directive_batches`) | `lock_session`, `execution_bucket` | Drop | Unused in OSS baseline | Drop columns at cutover; metering import |
| `meter_commissionings` | `initialised_steps`, `pending_steps`, `processing_steps`, `successful_steps`, `failed_steps`, `total_steps`, `lock_session` | Drop | Step counters and lock unused in OSS baseline | Drop columns at cutover; metering import |
| `meters` | `power_down_count`, `power_down_count_updated_at`, `is_simulated`, `pulse_counter_kwh`, `pulse_counter_kwh_updated_at` | Drop | Unused in OSS baseline | Drop columns at cutover; metering import |
| `meters_with_account_and_statuses` | same five columns (view columns) | Drop from view definition | Follows `meters` column drops | Recreate view without columns |

### §9 — Motivated by register #19 (payments + production monitoring column prunes, Task 3b G3)

| Table / view | Column(s) | Change | Rationale | Cutover / code impact |
|---|---|---|---|---|
| `wallets` | `goldring_migration_id` | Drop | Goldring migration-era ID; only in entity/types | Drop column at cutover; wallet entity at payments import |
| `orders` | `external_system` | Drop | Unused in OSS baseline | Drop column at cutover; order entity at payments import |

### §10 — Motivated by register #20 (notifications + field ops, Task 3b G4)

| Table / view | Column(s) | Change | Rationale | Cutover / code impact |
|---|---|---|---|---|
| `issues` | `external_system` | Rename → `external_tracking_system` | Distinguish external ticket tracker from integration `external_system` elsewhere | `ALTER TABLE … RENAME COLUMN` at cutover; issue entity at field-ops import |
| `issues` | `external_reference` | Rename → `external_tracking_reference` | Pair with tracking-system rename | `ALTER TABLE … RENAME COLUMN` at cutover; issue entity at field-ops import |
| `issues` | `estimated_lost_revenue`, `snoozed_until`, `mppt_id`, `grid_id` | Drop | Unused or superseded in OSS baseline (`grid_id` derivable via `meter_id`) | Drop columns at cutover; field-ops import |

### §pending — Column prune backlog

> _(empty — all provisional drops from Task 3a/3b resolved in G1–G4.)_

## Programmability adjustments

Authoritative for init-migration changes to **keep** enums (value trims), functions, and triggers.
**Working review copy:** `002b-schema-programmability-review.md` (Task 3c).

### §1 — Motivated by register #16 (meter command batch renames, Task 3c H1a)

| Object | Change | Rationale | Cutover / code impact |
|--------|--------|-----------|------------------------|
| `append_rls_organization_id_by_directive_batch_id()` | Rename → `append_rls_organization_id_by_meter_command_batch_id()` | Register #16 — align with renamed `meter_command_batches` table | `ALTER FUNCTION … RENAME` at cutover; init uses new name |
| Trigger `append_rls_organization_id_on_directive_batch_insert` | Rename → `append_rls_organization_id_on_meter_command_batch_insert` ON `meter_command_batches` | Register #16 | `ALTER TRIGGER … RENAME` + table rename at cutover |
| Trigger `append_rls_organization_id_on_directive_batch_execution_insert` | Rename → `append_rls_organization_id_on_meter_command_batch_execution_insert` ON `meter_command_batch_executions` | Register #16 | `ALTER TRIGGER … RENAME` + table rename at cutover |
| Index `idx_directive_batches_rls_organization_id` | Rename → `idx_meter_command_batches_rls_organization_id` ON `meter_command_batches` | Register #16 | `ALTER INDEX … RENAME` at cutover |
| Index `idx_directive_batch_executions_rls_organization_id` | Rename → `idx_meter_command_batch_executions_rls_organization_id` ON `meter_command_batch_executions` | Register #16 | `ALTER INDEX … RENAME` at cutover |

### §2 — Motivated by register #21 (orphan RLS helper drop, Task 3c H1a)

| Object | Change | Rationale | Cutover / code impact |
|--------|--------|-----------|------------------------|
| `append_rls_organization_id_by_historical_grid_id()` | Drop function | Orphan — no trigger; never wired in chain | `DROP FUNCTION` at cutover if present; omit from init migration |

### §3 — Motivated by register #22 (admin organization becomes DB-native, Task 3c H1c)

| Object | Change | Rationale | Cutover / code impact |
|--------|--------|-----------|------------------------|
| `rls_check_if_nxt_member()` | Rename → `rls_check_if_admin_org_member()`; body redesigned to `SELECT id FROM organizations WHERE organization_type = 'PLATFORM_OPERATOR' LIMIT 1` (via `one_platform_operator_org` index); `LANGUAGE sql STABLE` | RLS cannot call `getConfig()`; DB-native admin org. **Amended 2026-07-13 (Task 8):** GUC + sync trigger dropped — Supabase `postgres` role cannot `ALTER DATABASE … SET` custom params | `DROP FUNCTION` old name + `CREATE FUNCTION` new name at cutover; update ~40 `"Allow NXT Grid"` policies to reference new name |
| `organization_type_enum` | Add value `PLATFORM_OPERATOR` | Marks the platform-operator organization row; not in legacy chain | `ALTER TYPE … ADD VALUE` at cutover; flag NXT Grid's org row |
| `organizations` | Add partial unique index `one_platform_operator_org` on `organization_type` WHERE `= 'PLATFORM_OPERATOR'` | Enforce at most one platform-operator org | `CREATE UNIQUE INDEX` at cutover |
| ~~`sync_admin_organization_id_guc()` + trigger~~ | **Dropped** (Task 8 amendment) | GUC mechanism required superuser `ALTER DATABASE`; not available to migration role or SQL-editor callers on Supabase | Omit from company cutover; not in init migration |

### §4 — Motivated by register #23 (`append_rls_*` consolidation, Task 3c H1b)

| Object | Change | Rationale | Cutover / code impact |
|--------|--------|-----------|------------------------|
| `rls_org_id_from_grid(grid_id)` | Add (new) | Leaf helper — `SELECT organization_id FROM grids WHERE id = grid_id`; `LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''` | `CREATE FUNCTION` at cutover |
| `rls_org_id_from_customer(customer_id)` | Add (new) | Delegates to `rls_org_id_from_grid()` via `customers.grid_id` | `CREATE FUNCTION` at cutover |
| `rls_org_id_from_connection(connection_id)` | Add (new) | Delegates to `rls_org_id_from_customer()` via `connections.customer_id` | `CREATE FUNCTION` at cutover |
| `rls_org_id_from_agent(agent_id)` | Add (new) | Delegates to `rls_org_id_from_grid()` via `agents.grid_id` | `CREATE FUNCTION` at cutover |
| `rls_org_id_from_meter(meter_id)` | Add (new) | Delegates to `rls_org_id_from_connection()` via `meters.connection_id` | `CREATE FUNCTION` at cutover |
| `rls_org_id_from_dcu(dcu_id)` | Add (new) | Delegates to `rls_org_id_from_grid()` via `dcus.grid_id` | `CREATE FUNCTION` at cutover |
| `append_rls_organization_id_by_account_id()` | Body redesign | Dead join to `organizations` removed; direct `SELECT organization_id FROM accounts WHERE id = NEW.account_id` | `CREATE OR REPLACE FUNCTION` at cutover; same name/trigger |
| `append_rls_organization_id_by_grid_id()` | Body redesign | `NEW.rls_organization_id := rls_org_id_from_grid(NEW.grid_id)` | `CREATE OR REPLACE FUNCTION` at cutover; same name/trigger |
| `append_rls_organization_id_by_connection_id()` | Body redesign | `NEW.rls_organization_id := rls_org_id_from_connection(NEW.connection_id)` | `CREATE OR REPLACE FUNCTION` at cutover; same name/trigger |
| `append_rls_organization_id_by_customer_id()` | Body redesign | `NEW.rls_organization_id := rls_org_id_from_customer(NEW.customer_id)` | `CREATE OR REPLACE FUNCTION` at cutover; same name/trigger |
| `append_rls_organization_id_by_customer_id_or_agent_id_or_connec()` | Body redesign | Each `IF/ELSIF` branch delegates to the matching helper; `organization_id` branch assigns `NEW.organization_id` directly (2nd dead lookup removed) | `CREATE OR REPLACE FUNCTION` at cutover; same name/trigger |
| `append_rls_organization_id_by_dcu_id_or_meter_id()` | Body redesign | Branches delegate to `rls_org_id_from_dcu()` / `rls_org_id_from_meter()` | `CREATE OR REPLACE FUNCTION` at cutover; same name/trigger |
| `append_rls_organization_id_by_directive_batch_id()` (→ `by_meter_command_batch_id()`, register #16) | Body redesign | Looks up `grid_id` from the batch row, delegates to `rls_org_id_from_grid()` | `CREATE OR REPLACE FUNCTION` at cutover under the renamed name |
| `append_rls_organization_id_by_meter_id()` | Body redesign | `NEW.rls_organization_id := rls_org_id_from_meter(NEW.meter_id)` | `CREATE OR REPLACE FUNCTION` at cutover; same name/trigger |
| `append_rls_organization_id_by_metering_hardware_install_session()` | Body redesign | Looks up `meter_id` from the session row, delegates to `rls_org_id_from_meter()` | `CREATE OR REPLACE FUNCTION` at cutover; same name/trigger |
| `append_rls_organization_id_by_order_id()` | Body redesign | Looks up `historical_grid_id` from the order row, delegates to `rls_org_id_from_grid()` | `CREATE OR REPLACE FUNCTION` at cutover; same name/trigger |
| All 10 functions above | Add `SET search_path TO ''` | Addresses Supabase "Function Search Path Mutable" linter warning (9 of 10 were missing it) | Included in the `CREATE OR REPLACE FUNCTION` bodies above |

### §5 — Motivated by register #24 (`lock_next_order_and_wallets` search_path, Task 3c H1b spillover)

| Object | Change | Rationale | Cutover / code impact |
|--------|--------|-----------|------------------------|
| `lock_next_order_and_wallets(uuid)` | Add `SET search_path TO ''` | Same linter fix as register #23; logic unchanged | `CREATE OR REPLACE FUNCTION` at cutover; no behavior change |

### §6 — Motivated by register #25 (`accounts.organization_id` index, Task 3c H1b)

| Object | Change | Rationale | Cutover / code impact |
|--------|--------|-----------|------------------------|
| `accounts` | Add index `idx_accounts_organization_id` on `organization_id` | Supports existing `Allow org member to select` / `Allow org members to update` RLS policies, which filter directly on this column with no prior index | `CREATE INDEX IF NOT EXISTS` at cutover |

### §7 — Motivated by register #26 (`get_grid_status` redesign, Task 3c H2)

| Object | Change | Rationale | Cutover / code impact |
|--------|--------|-----------|------------------------|
| `get_grid_status(grid_id integer)` | Drop `are_all_dcus_online` and `are_all_dcus_under_high_load_threshold` from `RETURNS TABLE`; remove from `SELECT` body; mark **`STABLE`** | Register #17 drops those `grids` columns; function must align or init migration fails. Pegasus gateway alerts use `dcus.is_online` query instead | `CREATE OR REPLACE FUNCTION` at cutover; pegasus types at production-monitoring import |

### §8 — Motivated by register #27 (payments reporting RPCs, Task 3c H3)

| Object | Change | Rationale | Cutover / code impact |
|--------|--------|-----------|------------------------|
| `find_energy_topup_revenue(grid_id, start_date, end_date)` | Mark **`STABLE`** | Read-only aggregate; no side effects | `CREATE OR REPLACE FUNCTION` at cutover |
| `find_top_spenders(...)` | Mark **`STABLE`**; `GROUP BY meta_receiver_id_part_2, meta_receiver_name_part_2` only (drop `meta_receiver_id`) | Customer-level top-spender aggregation; legacy meter id in GROUP BY split one customer across rows | `CREATE OR REPLACE FUNCTION` at cutover; return shape unchanged |

### §9 — Motivated by register #28 (`external_system_enum` value trim, Task 3c H4a)

| Object | Change | Rationale | Cutover / code impact |
|--------|--------|-----------|------------------------|
| `external_system_enum` | Omit values `JOTFORM`, `STEAMACO`, `ACREL` from init migration | JOTFORM: pd-hero dropped (#14); STEAMACO/ACREL: no live code refs. **JIRA retained** — `issues.external_tracking_system` uses this enum with default `'JIRA'` | Company DB: audit all columns typed `external_system_enum`; migrate rows off dropped values before enum recreation at cutover |

### §10 — Motivated by register #29 (`notification_type_enum` value trim, Task 3c H4d)

| Object | Change | Rationale | Cutover / code impact |
|--------|--------|-----------|------------------------|
| `notification_type_enum` | Omit value `AUTO_PAYOUT_GENRATION_REPORT` from init migration | Payouts module dropped (register #13); sendgrid case for this type becomes dead code at notifications import | Company DB: audit/archive `notifications` rows with this type before enum recreation at cutover |

### §pending — Programmability backlog

> None — Task 3c complete (2026-07-09).

## Performance adjustments

Authoritative for init-migration index additions/renames/removals and other structural performance
changes on **keep** objects. **Working review copy:** `002b-schema-performance-audit.md` (Task 3d).

### §1 — Motivated by register #30 (D1 index coverage sweep, Task 3d)

**Tier 1 — RLS-predicate / renamed-FK gaps:**

| Table | Index (new) | Column | Rationale |
|---|---|---|---|
| `grids` | `idx_grids_organization_id` | `organization_id` | RLS predicate ("Allow org members to select") + FK; same class of gap as register #25 |
| `metering_hardware_imports` | `idx_metering_hardware_imports_rls_organization_id` | `rls_organization_id` | RLS predicate; table had zero non-PK indexes |
| `meter_command_batch_executions` | `idx_meter_command_batch_executions_meter_command_batch_id` | `meter_command_batch_id` (renamed from `directive_batch_id`, register #16) | Parent-lookup FK, unindexed |

**Tier 2 — plain FK-column hygiene (44 indexes):**

| Table | Column | Index (new) |
|---|---|---|
| `agents` | `grid_id` | `idx_agents_grid_id` |
| `api_keys` | `account_id` | `idx_api_keys_account_id` |
| `audits` | `agent_id` | `idx_audits_agent_id` |
| `audits` | `author_id` | `idx_audits_author_id` |
| `audits` | `connection_id` | `idx_audits_connection_id` |
| `audits` | `customer_id` | `idx_audits_customer_id` |
| `audits` | `dcu_id` | `idx_audits_dcu_id` |
| `audits` | `grid_id` | `idx_audits_grid_id` |
| `audits` | `member_id` | `idx_audits_member_id` |
| `audits` | `meter_id` | `idx_audits_meter_id` |
| `audits` | `organization_id` | `idx_audits_organization_id` |
| `connection_requested_meters` | `connection_id` | `idx_connection_requested_meters_connection_id` |
| `dcus` | `grid_id` | `idx_dcus_grid_id` |
| `energy_cabins` | `grid_id` | `idx_energy_cabins_grid_id` |
| `meter_command_batches` | `author_id` | `idx_meter_command_batches_author_id` |
| `meter_command_batches` | `grid_id` | `idx_meter_command_batches_grid_id` |
| `meter_commissionings` | `metering_hardware_install_session_id` | `idx_meter_commissionings_metering_hardware_install_session_id` |
| `metering_hardware_imports` | `metering_hardware_install_session_id` | `idx_metering_hardware_imports_metering_hardware_install_session_id` |
| `metering_hardware_install_sessions` | `author_id` | `idx_metering_hardware_install_sessions_author_id` |
| `metering_hardware_install_sessions` | `dcu_id` | `idx_metering_hardware_install_sessions_dcu_id` |
| `metering_hardware_install_sessions` | `meter_id` | `idx_metering_hardware_install_sessions_meter_id` |
| `meters` | `pole_id` | `idx_meters_pole_id` |
| `mppts` | `grid_id` | `idx_mppts_grid_id` |
| `notes` | `author_id` | `idx_notes_author_id` |
| `notes` | `connection_id` | `idx_notes_connection_id` |
| `notes` | `customer_id` | `idx_notes_customer_id` |
| `notes` | `meter_id` | `idx_notes_meter_id` |
| `notifications` | `account_id` | `idx_notifications_account_id` |
| `notifications` | `grid_id` | `idx_notifications_grid_id` |
| `notifications` | `notification_parameter_id` | `idx_notifications_notification_parameter_id` |
| `notifications` | `organization_id` | `idx_notifications_organization_id` |
| `orders` | `author_id` | `idx_orders_author_id` |
| `orders` | `receiver_wallet_id` | `idx_orders_receiver_wallet_id` |
| `orders` | `sender_wallet_id` | `idx_orders_sender_wallet_id` |
| `pd_site_submissions` | `organization_id` | `idx_pd_site_submissions_organization_id` |
| `pd_sites` | `operations_grid_id` | `idx_pd_sites_operations_grid_id` |
| `pd_sites` | `organization_id` | `idx_pd_sites_organization_id` |
| `poles` | `grid_id` | `idx_poles_grid_id` |
| `routers` | `grid_id` | `idx_routers_grid_id` |
| `transactions` | `order_id` | `idx_transactions_order_id` |
| `ussd_session_hops` | `ussd_session_id` | `idx_ussd_session_hops_ussd_session_id` |
| `ussd_sessions` | `account_id` | `idx_ussd_sessions_account_id` |
| `ussd_sessions` | `bank_id` | `idx_ussd_sessions_bank_id` |
| `ussd_sessions` | `meter_id` | `idx_ussd_sessions_meter_id` |

**Reviewed and excluded (no index added):**

| Table | Column | Reason |
|---|---|---|
| `members` | `busy_commissioning_id` | FK to `grids`, write-only (invite/update member) — no query filters by it; traced all usages in `legacy/` |
| `meters` | `rls_grid_id` | FK to `grids`, denormalized alongside `rls_organization_id` on meter assignment — but no RLS policy or query reads it; write-only today |

**Reviewed, no change (not redundant):** `orders` full+partial index pairs on `historical_grid_id` and
`meta_receiver_id` — partial indexes serve the `ENERGY_TOPUP` hot path; both kept.

**Cutover / code impact:** `CREATE INDEX IF NOT EXISTS` for all 47 at cutover (no-op if already
present); init migration includes them from the start; no app code changes (pure read-path
performance, no behavior change).

### §2 — Motivated by register #31 (D2 function volatility, Task 3d)

| Object | Change | Rationale | Cutover / code impact |
|--------|--------|-----------|------------------------|
| `rls_check_if_lender()` | Mark `STABLE` | Single-statement `auth.jwt()` read, no side effects; same shape as register #22 | `CREATE OR REPLACE FUNCTION` at cutover; no behavior change |
| `rls_get_member_org_id()` | Mark `STABLE` | Single-statement `auth.jwt()` read, no side effects; most-invoked RLS helper in the schema (~24 policies) | `CREATE OR REPLACE FUNCTION` at cutover; no behavior change |

All other keep functions' volatility was already decided in Task 3c (registers #22, #23, #26, #27) or
is correctly left at the implicit `VOLATILE` default (functions with real side effects — `INSERT`,
`UPDATE`, `set_config()` — or trigger functions, where volatility marking has no planner effect since
they're invoked once per row by the trigger manager rather than through query-expression evaluation).
No further volatility work remains for any keep function.

### §3 — Motivated by register #32 (D3 RLS policy invocation pattern, Task 3d)

| Table | Policy | Clause | Function | Change |
|---|---|---|---|---|
| `grids` | Allow NXT Grid to insert | `WITH CHECK` | `rls_check_if_admin_org_member()` | Wrap in `( SELECT … AS … )` |
| `meters` | Allow NXT Grid to insert | `WITH CHECK` | `rls_check_if_admin_org_member()` | Wrap |
| `notes` | Allow NXT Grid to insert | `WITH CHECK` | `rls_check_if_admin_org_member()` | Wrap |
| `organizations` | Allow NXT Grid to insert | `WITH CHECK` | `rls_check_if_admin_org_member()` | Wrap |
| `pd_sites` | Allow NXT Grid to insert | `WITH CHECK` | `rls_check_if_admin_org_member()` | Wrap |
| `poles` | Allow NXT Grid to insert | `WITH CHECK` | `rls_check_if_admin_org_member()` | Wrap |
| `wallets` | Allow NXT Grid to insert | `WITH CHECK` | `rls_check_if_admin_org_member()` | Wrap |
| `accounts` | Allow NXT Grid to update | `USING` | `rls_check_if_admin_org_member()` | Wrap |
| `connections` | Allow NXT Grid to update | `USING` | `rls_check_if_admin_org_member()` | Wrap |
| `grids` | Allow NXT Grid to update | `USING` | `rls_check_if_admin_org_member()` | Wrap |
| `meters` | Allow NXT Grid to update | `USING` | `rls_check_if_admin_org_member()` | Wrap |
| `organizations` | Allow NXT Grid to update | `USING` | `rls_check_if_admin_org_member()` | Wrap |
| `pd_site_submissions` | Allow NXT Grid to update | `USING` | `rls_check_if_admin_org_member()` | Wrap |
| `pd_sites` | Allow NXT Grid to update | `USING` | `rls_check_if_admin_org_member()` | Wrap |
| `notes` | Allow org members to insert | `WITH CHECK` | `rls_get_member_org_id()` | Wrap |
| `poles` | Allow org members to insert | `WITH CHECK` | `rls_get_member_org_id()` | Wrap |
| `accounts` | Allow org members to update | `USING` | `rls_get_member_org_id()` | Wrap |
| `orders` | Allow org members to update | `USING` | `rls_get_member_org_id()` | Wrap |

**Unchanged (51 policies):** every `SELECT` policy calling one of the 3 RLS helper functions, across
all 35 keep tables, is already wrapped — no action.

**Cutover / code impact:** policy bodies only; no table/column/app changes. Company DB at cutover:
recreate the 18 listed policies with the wrapped clause (same boolean semantics, no behavior change).

### §pending — Performance backlog

> None — Task 3d complete (2026-07-10). D1–D4 all signed off; see
> `002b-schema-performance-audit.md`.

## Data API access adjustments

Authoritative for init-migration decisions about Postgres `GRANT`/`ALTER DEFAULT PRIVILEGES`
statements that govern Data API (PostgREST/GraphQL) reachability on **keep** objects. Not part of
Task 3d (performance) — found during the final pre-close sanity check on 2026-07-10, prompted by a
Supabase platform default change discovered mid-review.

### §1 — Motivated by register #33 (Data API grants)

| Object(s) | Change | Rationale | Cutover / code impact |
|-----------|--------|-----------|------------------------|
| Every keep table, sequence, function | Keep `GRANT ALL ON TABLE/SEQUENCE/FUNCTION … TO "anon"/"authenticated"/"service_role"` (mirrors legacy dump, keep-bucket scope) | Required for Data API reachability on any project created on/after 2026-05-30 (Supabase no longer auto-grants); makes the baseline self-contained regardless of project-creation toggle or hosting mode | Init migration includes these grants from the start; Task 5 must **not** treat them as "supabase-managed grant noise" to strip |
| 3 `ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES/SEQUENCES/FUNCTIONS TO "anon"/"authenticated"/"service_role"` statements | Omit from init migration | Deliberate: aligns with Supabase's now-recommended pattern (explicit grant + RLS + policy per migration, no ambient auto-expose of future tables) rather than re-introducing the default the platform itself is retiring | Company DB: no-op, existing default-privileges setup untouched (production tables grandfathered). 002c capability imports and any adopter migrations must add explicit `GRANT` statements for new `public` tables going forward |

**Cutover / code impact:** no company DB change (existing grants/default-privileges untouched either
way — production tables are grandfathered regardless per Supabase's changelog). Governs only the OSS
baseline template and future migrations (002c onward). Task 9.2 must verify a keep table is actually
reachable via the Data API on a fresh hosted project (not just "no errors in dashboard") — this is a
new done-when criterion, not covered by the original Task 9 wording.

## FK design adjustments

Authoritative for init-migration changes to FK `ON DELETE`/`ON UPDATE` behavior on **keep** objects.
Not part of Task 3d (which covered indexes, function volatility, RLS invocation pattern, and
trigger/view design, but not FK relationship shape) — found during the final pre-close sanity check
on 2026-07-10, prompted by the maintainer's recollection of "back-and-forth" FK pairs.

### §1 — Motivated by register #34 (FK cycle hardening)

**Method:** enumerated every FK constraint in the legacy chain, filtered to edges where both
endpoints are keep tables, and searched the resulting graph for cycles. Result: **5 direct 2-cycles,
0 cycles of length 3+** — the full set, confirmed by an independent sweep of every `last_`/`latest_`
prefixed column name across all 35 keep tables (only 6 such columns exist; the 6th,
`pd_actions.latest_pd_document_id`, is on a dropped table and out of scope).

| Forward pointer FK (change) | Structural back-pointer (unchanged) |
|---|---|
| `meters.last_metering_hardware_install_session_id` → `metering_hardware_install_sessions.id` | `metering_hardware_install_sessions.meter_id` → `meters.id` |
| `metering_hardware_install_sessions.last_metering_hardware_import_id` → `metering_hardware_imports.id` | `metering_hardware_imports.metering_hardware_install_session_id` → `metering_hardware_install_sessions.id` |
| `metering_hardware_install_sessions.last_meter_commissioning_id` → `meter_commissionings.id` | `meter_commissionings.metering_hardware_install_session_id` → `metering_hardware_install_sessions.id` |
| `dcus.last_metering_hardware_install_session_id` → `metering_hardware_install_sessions.id` | `metering_hardware_install_sessions.dcu_id` → `dcus.id` |
| `meters.last_encountered_issue_id` → `issues.id` | `issues.meter_id` → `meters.id` |

**Change:** add `ON DELETE SET NULL` to the 5 forward pointer FKs (left column) only. The 5
structural back-pointers (right column) are unchanged — they stay `NO ACTION`, since a
session/import/commissioning/issue should never silently lose its real parent reference.

**Rationale:** all 5 forward pointers are a deliberate, actively-used "denormalized latest child"
cache — not redundant. Confirmed via `dcus.service.ts` ("we have a dcu property point at the latest
dcu session, so it's easily retrievable"), the `meters_with_account_and_statuses` view (chains 4 of
the 5 cycles in one query), PostgREST embeds (`meter-installs.service.ts`,
`meter-uninstalls.service.ts`), and a TypeORM `@OneToOne` (`meter.entity.ts`). Both sides of every
cycle are already indexed — forward pointers via pre-existing `UNIQUE` constraints, structural
back-pointers via register #30 (Task 3d D1) — so query efficiency is not a gap. The one real gap:
every one of these 10 FKs defaults to `NO ACTION`, so deleting a row on either side while still
referenced fails outright. A full sweep of `legacy/` found **zero** hard-deletes
(`.delete()`/`DELETE FROM`/`.remove()`) against any table anywhere in the codebase — every removal
is a soft-delete (`deleted_at`) or a status transition — so this isn't live-impacting today, but is a
latent trap for future/manual/ops-level deletes (e.g. dev data resets, admin cleanup).

**Cutover / code impact:** no application code change (nothing today triggers a delete on these
tables); no data impact (existing rows unaffected — this only changes what happens on a future
`DELETE`). Company DB at cutover: `ALTER TABLE … DROP CONSTRAINT` + `ADD CONSTRAINT … FOREIGN KEY …
ON DELETE SET NULL` for each of the 5 (Postgres has no in-place "alter constraint action" — must
drop/recreate).

## Appendix — annotated A/B diff (002b Task 6)

**Verified:** 2026-07-13 (maintainer sign-off). **Tool:** structured parser
`docs/plans/002-oss-migration/002b-task6/compare_schemas.py` (migra not installed;
falls back per plan). **Dumps:** `pg_dump --schema-only --no-owner --no-privileges
--schema=public` from legacy chain (`legacy/`, PG15) vs root baseline (`nxt-backend/`,
PG15 provisional). **Invocation:**

```bash
# legacy chain (sequential — one stack at a time)
cd legacy && npx supabase@2.109.1 start
PGPASSWORD=postgres pg_dump "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  --schema-only --no-owner --no-privileges --schema=public > /tmp/schema-old.sql
npx supabase@2.109.1 stop

# baseline
cd .. && npx supabase@2.109.1 start && npx supabase@2.109.1 db reset
PGPASSWORD=postgres pg_dump "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  --schema-only --no-owner --no-privileges --schema=public > /tmp/schema-new.sql

python3 docs/plans/002-oss-migration/002b-task6/compare_schemas.py \
  /tmp/schema-old.sql /tmp/schema-new.sql
```

**Assertion:** every structural diff is explained by a register entry. **226 explained**
hunks; **9 script false-positives** (all manually resolved — see table below). **0 real gaps**
after register **#22** `one_platform_operator_org` index was added (2026-07-10).

### Object inventory (post-normalization)

| Object | Legacy chain | Baseline | Delta |
|--------|-------------|----------|-------|
| Tables | 57 | 35 | −22 dropped |
| Enum types | 42 | 31 | −11 dropped |
| Functions | 27 | 26 | −8 dropped, +7 new helpers |
| RLS policies (non-parameterized) | 102 | 76 | −26 w/dropped tables, −21 readonly-role |
| Indexes | 55 | 93 | +38 net (register #25/#30 adds, #22 partial unique) |

Column sets on all 35 kept tables **match** after applying column-adjustment drops/renames.

### Explained diff summary by register entry

| Register | Count | What changed |
|----------|------:|--------------|
| #1 | 3 | Drop deprecated directive tables + `batch_commands` view |
| #4 | 1 | Drop `directive_watchdog_sessions` |
| #6 | 3 | Drop Make.com notify functions |
| #7 | 2 | Drop meter credit transfers table + function |
| #8 | 2 | Drop features / member_feature |
| #9 | 1 | Drop TypeORM `migrations` ledger |
| #12 | 4 | Drop device registry tables + function |
| #13 | 3 | Drop payouts module |
| #14 | 10 | Drop pd-hero workflow tables |
| #15 | 1 | Drop autopilot_executions |
| #16 | 4 | Rename directive_batches → meter_command_batches (+ indexes) |
| #16/#22 | 2 | Function renames (batch helper, admin-org check) |
| #21 | 1 | Drop orphan historical_grid helper |
| #22 | 3 | PLATFORM_OPERATOR enum, admin-org redesign, partial unique index |
| #23 | 6 | New rls_org_id_from_* helpers |
| #23 | 10 | append_rls_* function body redesigns |
| #24 | 1 | lock_next_order_and_wallets search_path |
| #25/#30 | 50 | New FK/RLS indexes (incl. one_platform_operator_org counted under #22) |
| #26 | 1 | get_grid_status narrowed return + STABLE |
| #27 | 2 | find_top_spenders / find_energy_topup_revenue fixes |
| #28 | 3 | external_system_enum value trims |
| #29 | 1 | notification_type_enum value trim |
| #31 | 2 | STABLE on remaining RLS helpers |
| #32/#22 | 45 | Policy body rewrites (wrap + function rename) |
| #34 | 5 | ON DELETE SET NULL on 5 latest-pointer FKs |
| drop cascade | 4 | Indexes on dropped tables (name lacks table prefix) |
| register drop | 43 | FKs referencing dropped tables/columns |
| column adjustments | (0 stray) | All column diffs absorbed — no unexplained column mismatches |

**Not in dumps (by design):**

- **#2/#3/#5/#6** — parameterized roles/policies/grants (company infra; omitted from baseline)
- **#11** — extension omit/drop (platform defaults vs explicit CREATE EXTENSION)
- **#33** — grants omitted from dump (`--no-privileges`); explicit per-object GRANTs live in
  init migration; DEFAULT PRIVILEGES omitted per register
- **auth.users triggers** — outside `--schema=public` scope; present in migration, applied at
  `db reset`

### Nine false-positive script flags (resolved)

| Item | Register | Notes |
|------|----------|-------|
| 6 × hash-named indexes (`IDX_*`) on `directives` / `member_feature` | #1 / #8 | Index names don't contain table name; script missed drop-cascade attribution |
| `idx_lorawan_batch_status` | #1 | Index on dropped `lorawan_directives` |
| Trigger `…_execution_insert` (old) vs `…_execution_ins` (new) | #16 | Postgres 63-char identifier truncation — same trigger, truncated name in live DB |

### Cosmetic identifier truncations (non-blocking)

Postgres truncates identifiers > 63 chars at `db reset` (NOTICE only):

- Trigger: `append_rls_organization_id_on_meter_command_batch_execution_insert` → `…_ins`
- Index: `idx_metering_hardware_imports_metering_hardware_install_session_id` → truncated

Migration source text retains the long names; live objects use truncated names. No functional impact.
