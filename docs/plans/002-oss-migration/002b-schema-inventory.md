# Schema Inventory

**Companion to:** `002b-database-baseline.md`
**Generated:** 2026-07-08 from local reference DB (`legacy/supabase/migrations`, `npx supabase@2.54.10 db start`)
**Owned schemas:** `public` only (no custom application schemas beyond `public`)

## Summary

| Kind | Count |
|------|------:|
| enum | 42 |
| extension | 11 |
| function | 27 |
| role | 3 |
| sequence | 17 |
| storage bucket | 1 |
| table | 57 |
| trigger | 29 |
| view | 4 |
| **Total rows** | **191** |

Spot-check: **57 tables** in `public` (first migration creates 57 — matches after full chain).

Sequences: 39 total in `public`; 17 listed (use `nextval()` defaults, not serial-owned); 22 serial-owned sequences omitted.

Auth-schema triggers on `auth.users` are listed at the end — created by the migration chain but live on a Supabase-managed schema.

## Register

| object | kind | schema | bucket | owning capability | notes |
|--------|------|--------|--------|-------------------|-------|
| accounts | table | public | keep | Platform core | RLS enabled; 6 policies |
| agents | table | public | keep | Platform core | RLS enabled; 2 policies |
| api_keys | table | public | keep | Platform core | RLS enabled |
| audits | table | public | keep | (5) Field ops | RLS enabled; 1 policy; user-admin / install audit trail |
| autopilot_executions | table | public | drop |  | RLS enabled; register #15 — deferred capability; future microservice |
| bank_accounts | table | public | drop |  | RLS enabled; register #13 |
| banks | table | public | keep | (3) Payments | RLS enabled |
| connection_requested_meters | table | public | keep | (2) Metering | RLS enabled; 2 policies |
| connections | table | public | keep | (2) Metering | RLS enabled; 5 policies |
| customers | table | public | keep | (2) Metering | RLS enabled; 4 policies |
| dcus | table | public | keep | Platform core | RLS enabled; 4 policies |
| device_logs | table | public | drop |  | RLS enabled; 3 policies; register #12 |
| device_types | table | public | drop |  | RLS enabled; 4 policies; register #12 |
| devices | table | public | drop |  | RLS enabled; 3 policies; register #12 |
| directive_batch_executions | table | public | keep | (2) Metering | RLS enabled; 2 policies; **rename → `meter_command_batch_executions`** (register #16) |
| directive_batches | table | public | keep | (2) Metering | RLS enabled; 3 policies; **rename → `meter_command_batches`** (register #16); drop `directive_type` (register #1 §1) |
| directive_watchdog_sessions | table | public | drop |  | RLS enabled; register #4 |
| directives | table | public | exclude |  | RLS enabled; 3 policies |
| energy_cabins | table | public | keep | (1) Production monitoring | RLS enabled; 2 policies; pegasus grid map layer (Supabase read) |
| features | table | public | drop |  | RLS enabled; 2 policies; register #8 |
| grids | table | public | keep | Platform core | RLS enabled; 7 policies |
| issues | table | public | keep | (5) Field ops | RLS enabled; 2 policies |
| lorawan_directives | table | public | exclude |  | RLS enabled; 3 policies |
| member_feature | table | public | drop |  | RLS enabled; register #8 |
| members | table | public | keep | Platform core | RLS enabled; 2 policies |
| meter_commissionings | table | public | keep | (2) Metering | RLS enabled; 2 policies |
| meter_credit_transfers | table | public | exclude |  | RLS enabled; register #7 |
| meter_interactions | table | public | keep | (2) Metering | RLS enabled; 2 policies; `batch_execution_id` → `meter_command_batch_executions` (register #16) |
| metering_hardware_imports | table | public | keep | (2) Metering | RLS enabled; 1 policy |
| metering_hardware_install_sessions | table | public | keep | (2) Metering | RLS enabled; 3 policies |
| meters | table | public | keep | (2) Metering | RLS enabled; 5 policies; drop `current_special_status` (register #1 §1); drop `device_id` (register #12 §4) |
| migrations | table | public | drop |  | RLS enabled; legacy TypeORM ledger; register #9 |
| mppts | table | public | keep | (1) Production monitoring | RLS enabled; 2 policies |
| notes | table | public | keep | (5) Field ops | RLS enabled; 5 policies |
| notification_parameters | table | public | keep | (4) Notifications | RLS enabled |
| notifications | table | public | keep | (4) Notifications | RLS enabled |
| orders | table | public | keep | (3) Payments | RLS enabled; 5 policies; drop `directive_id`, `lorawan_directive_id` (register #1 §1); drop `meter_credit_transfer_id` (register #7 §2) |
| organizations | table | public | keep | Platform core | RLS enabled; 6 policies |
| payouts | table | public | drop |  | RLS enabled; 1 policy; register #13 |
| pd_action_templates | table | public | drop |  | RLS enabled; 1 policy; register #14 |
| pd_actions | table | public | drop |  | RLS enabled; 3 policies; register #14 |
| pd_audits | table | public | drop |  | RLS enabled; 1 policy; register #14 |
| pd_document_templates | table | public | drop |  | RLS enabled; 1 policy; register #14 |
| pd_documents | table | public | drop |  | RLS enabled; 2 policies; register #14 |
| pd_flow_templates | table | public | drop |  | RLS enabled; 1 policy; register #14 |
| pd_flows | table | public | drop |  | RLS enabled; 3 policies; register #14 |
| pd_section_templates | table | public | drop |  | RLS enabled; register #14 |
| pd_sections | table | public | drop |  | RLS enabled; register #14 |
| pd_site_submissions | table | public | keep | (5) Field ops | RLS enabled; 3 policies; public submission form |
| pd_sites | table | public | keep | (5) Field ops | RLS enabled; 3 policies; drop `pd_flow_id` (register #14 §5) |
| poles | table | public | keep | Platform core | RLS enabled; 4 policies |
| routers | table | public | keep | Platform core | RLS enabled; 2 policies |
| solcast_cache | table | public | keep | (1) Production monitoring | RLS enabled |
| transactions | table | public | keep | (3) Payments | RLS enabled; 3 policies |
| ussd_session_hops | table | public | keep | (2) Metering | RLS enabled |
| ussd_sessions | table | public | keep | (2) Metering | RLS enabled |
| wallets | table | public | keep | (3) Payments | RLS enabled; 4 policies |
| agents_with_account | view | public | keep | Platform core |  |
| batch_commands | view | public | exclude |  | UNION over deprecated directive tables |
| customers_with_account | view | public | keep | (2) Metering | pegasus customers list |
| meters_with_account_and_statuses | view | public | keep | (2) Metering | drop `current_special_status` (register #1 §1); drop `device_id` (register #12 §4) |
| account_type_enum | enum | public | keep | Platform core | values: AGENT, MEMBER, CUSTOMER |
| communication_protocol_enum | enum | public | keep | (2) Metering | values: CALIN_V1, CALIN_V2, CALIN_LORAWAN; enum value trim deferred |
| currency_enum | enum | public | keep | (3) Payments | values: USD, NGN, EUR; shared across capabilities |
| directive_direction_enum | enum | public | exclude |  | values: UP, DOWN |
| directive_error_enum | enum | public | exclude |  | values: GRID_DOWN, DCU_OFFLINE, NO_METER, NO_DCU, NO_GRID, NO_CONNECTION, NO_CUSTOMER |
| directive_phase_enum | enum | public | exclude |  | values: A, B, C |
| directive_special_status_enum | enum | public | exclude |  | values: POWER_LIMIT_BREACHED, CREDIT_EXHAUSTED, …; was on `meters.current_special_status` (dropped) |
| directive_status_enum | enum | public | exclude |  | values: INITIALISED, PENDING, SENT_TO_API, … |
| directive_type_enum | enum | public | exclude |  | values: ON, OFF, READ_VOLTAGE, …; was on `directive_batches.directive_type` (dropped) |
| external_system_enum | enum | public | keep | Platform core | values: STEAMACO, CALIN, …; enum value trim deferred |
| fs_command_type_enum | enum | public | keep | (2) Metering | values: ON, OFF; on `meter_command_batches.fs_command` (renamed) |
| gender_enum | enum | public | keep | (2) Metering | values: MALE, FEMALE; on `customers`; enum value trim deferred |
| generator_type_enum | enum | public | keep | (2) Metering | values: SMALL, LARGE; on `customers`; enum value trim deferred |
| id_document_type_enum | enum | public | keep | (2) Metering | values: PASSPORT, NATIONAL_ID, …; on `customers`; enum value trim deferred |
| issue_status_enum | enum | public | keep | (5) Field ops | values: OPEN, CLOSED, OVERRIDDEN |
| issue_type_enum | enum | public | keep | (5) Field ops | values: NO_COMMUNICATION, METER_NOT_ACTIVATED, … |
| member_type_enum | enum | public | keep | Platform core | values: SUPERADMIN, ADMIN, PARTNER, … |
| meter_commissioning_status_enum | enum | public | keep | (2) Metering | values: PENDING, PROCESSING, SUCCESSFUL, FAILED |
| meter_credit_transfer_status_enum | enum | public | exclude |  | values: PENDING, PROCESSING, SUCCESSFUL, FAILED; register #7 |
| meter_interaction_status_enum | enum | public | keep | (2) Metering | values: QUEUED, ABORTED, PROCESSING, … |
| meter_interaction_type_enum | enum | public | keep | (2) Metering | values: READ_CREDIT, TOP_UP_KWH, TURN_ON, … |
| meter_phase_enum | enum | public | keep | (2) Metering | values: SINGLE_PHASE, THREE_PHASE |
| meter_type_enum | enum | public | keep | (2) Metering | values: HPS, FS |
| mhi_operation_enum | enum | public | keep | (2) Metering | values: ADD, REMOVE |
| mhi_status_enum | enum | public | keep | (2) Metering | values: PENDING, PROCESSING, SUCCESSFUL, FAILED |
| mppt_type_enum | enum | public | keep | (1) Production monitoring | values: MPPT, PV_INVERTER |
| notification_status_enum | enum | public | keep | (4) Notifications | values: PENDING, PROCESSING, … |
| notification_type_enum | enum | public | keep | (4) Notifications | values: GRID_IS_HPS_ON_STATE_CHANGE, …; enum value trim deferred |
| order_actor_type_enum | enum | public | keep | (3) Payments | values: BANKING_SYSTEM, ORGANIZATION, … |
| order_status_enum | enum | public | keep | (3) Payments | values: INITIALISED, PENDING, COMPLETED, … |
| order_type_enum | enum | public | keep | (3) Payments | values: ENERGY_TOPUP, CONNECTION_PAYMENT, … |
| organization_type_enum | enum | public | keep | Platform core | values: SOLAR_DEVELOPER, LENDER, DATA_AGGREGATOR |
| payment_channel_enum | enum | public | keep | (3) Payments | values: USSD, AYRTON, NIFFLER, TELEGRAM |
| payment_method_enum | enum | public | keep | (3) Payments | values: CREDIT_CARD, USSD, BANK_TRANSFER |
| payout_status_enum | enum | public | drop |  | register #13 |
| pd_action_status_enum | enum | public | drop |  | register #14 |
| pd_action_type_enum | enum | public | drop |  | register #14 |
| pd_document_type_enum | enum | public | drop |  | register #14 |
| solcast_cache_request_type_enum | enum | public | keep | (1) Production monitoring | values: ESTIMATED_ACTUALS, FORECAST |
| transaction_status_enum | enum | public | keep | (3) Payments | values: SUCCESSFUL, FAILED |
| wallet_type_enum | enum | public | keep | (3) Payments | values: VIRTUAL, REAL |
| weather_type_enum | enum | public | keep | Platform core | values: CLOUDY, CLOUDS, SHOWERS, SUNNY, … |
| append_rls_organization_id_by_account_id() | function | public | keep | Platform core | member insert trigger |
| append_rls_organization_id_by_connection_id() | function | public | keep | (2) Metering | connections / connection_requested_meters triggers |
| append_rls_organization_id_by_customer_id() | function | public | keep |  | shared — connections / customers / notes triggers |
| append_rls_organization_id_by_customer_id_or_agent_id_or_connec() | function | public | keep | (3) Payments | wallets trigger |
| append_rls_organization_id_by_dcu_id_or_meter_id() | function | public | keep | (2) Metering | metering_hardware_install_sessions trigger |
| append_rls_organization_id_by_device_id() | function | public | drop |  | register #12 |
| append_rls_organization_id_by_directive_batch_id() | function | public | keep | (2) Metering | **rename → `append_rls_organization_id_by_meter_command_batch_id()`** (register #16) |
| append_rls_organization_id_by_grid_id() | function | public | keep | Platform core | grid-scoped entity inserts |
| append_rls_organization_id_by_historical_grid_id() | function | public | keep | Platform core | orphan — no trigger in chain; review in Task 3c |
| append_rls_organization_id_by_meter_id() | function | public | keep | (5) Field ops | issues trigger |
| append_rls_organization_id_by_metering_hardware_install_session() | function | public | keep | (2) Metering | meter_commissionings trigger |
| append_rls_organization_id_by_order_id() | function | public | keep | (3) Payments | transactions trigger |
| append_rls_organization_id_by_receiver_meter_id() | function | public | exclude |  | only used by excluded `meter_credit_transfers` trigger; register #7 |
| find_energy_topup_revenue(grid_id integer, start_date timestamp with time zone, end_date timestamp with time zone) | function | public | keep | (3) Payments | `@core/spending` RPC |
| find_top_spenders(grid_id integer, limit_count integer, start_date timestamp with time zone, end_date timestamp with time zone) | function | public | keep | (3) Payments | `@core/spending` RPC |
| get_grid_status(grid_id integer) | function | public | keep | (1) Production monitoring | pegasus grid dashboard RPC |
| handle_new_user() | function | public | keep | Platform core | auth.users trigger |
| handle_update_user() | function | public | keep | Platform core | auth.users trigger |
| lock_next_order(uuid uuid) | function | public | drop |  | register #13 |
| lock_next_order_and_wallets(uuid uuid) | function | public | keep | (3) Payments | tiamat wallets service |
| lock_next_pd_action() | function | public | drop |  | loch pd-hero service; register #14 |
| notify_make_about_is_fs_on_updated() | function | public | parameterize |  | optional recipe: `docs/database/optional/make-grid-triggers.sql` |
| notify_make_about_is_hps_on_updated() | function | public | parameterize |  | optional recipe: `docs/database/optional/make-grid-triggers.sql` |
| notify_make_about_kwh_tariff_essential_service_updated() | function | public | parameterize |  | optional recipe: `docs/database/optional/make-grid-triggers.sql` |
| rls_check_if_lender() | function | public | keep | Platform core | RLS helper |
| rls_check_if_nxt_member() | function | public | keep | Platform core | RLS helper |
| rls_get_member_org_id() | function | public | keep | Platform core | RLS helper |
| append_rls_organization_id_on_agent_insert ON agents | trigger | public | keep | Platform core |  |
| append_rls_organization_id_on_requested_connection_meters_inser ON connection_requested_meters | trigger | public | keep | (2) Metering |  |
| append_rls_organization_id_on_connection_insert ON connections | trigger | public | keep | (2) Metering |  |
| append_rls_organization_id_on_customer_insert ON customers | trigger | public | keep | (2) Metering |  |
| append_rls_organization_id_on_dcus_insert ON dcus | trigger | public | keep | Platform core |  |
| append_rls_organization_id_by_device_id ON device_logs | trigger | public | drop |  | register #12 |
| append_rls_organization_id_on_devices_insert ON devices | trigger | public | drop |  | register #12 |
| append_rls_organization_id_on_directive_batch_execution_insert ON directive_batch_executions | trigger | public | keep | (2) Metering | **rename → `…_on_meter_command_batch_execution_insert` ON `meter_command_batch_executions`** (register #16) |
| append_rls_organization_id_on_directive_batch_insert ON directive_batches | trigger | public | keep | (2) Metering | **rename → `…_on_meter_command_batch_insert` ON `meter_command_batches`** (register #16) |
| append_rls_organization_id_on_directive_insert ON directives | trigger | public | exclude |  | deprecated table |
| append_rls_organization_id_on_energy_cabin_insert ON energy_cabins | trigger | public | keep | (1) Production monitoring | on keep table `energy_cabins` |
| notify_make_about_is_fs_on_updated ON grids | trigger | public | parameterize |  | optional recipe: `docs/database/optional/make-grid-triggers.sql` |
| notify_make_about_is_hps_on_updated ON grids | trigger | public | parameterize |  | optional recipe: `docs/database/optional/make-grid-triggers.sql` |
| notify_make_about_kwh_tariff_essential_service_updated ON grids | trigger | public | parameterize |  | optional recipe: `docs/database/optional/make-grid-triggers.sql` |
| append_rls_organization_id_on_issue_insert ON issues | trigger | public | keep | (5) Field ops |  |
| append_rls_organization_id_on_lorawan_directive_insert ON lorawan_directives | trigger | public | exclude |  | deprecated table |
| append_rls_organization_id_on_member_insert ON members | trigger | public | keep | Platform core |  |
| append_rls_organization_id_on_meter_commissioning_insert ON meter_commissionings | trigger | public | keep | (2) Metering |  |
| append_rls_organization_id_on_meter_credit_transfer_insert ON meter_credit_transfers | trigger | public | exclude |  | register #7 |
| append_rls_organization_id_on_meter_install_session_insert ON metering_hardware_install_sessions | trigger | public | keep | (2) Metering |  |
| append_rls_organization_id_on_meter_insert ON meters | trigger | public | keep | (2) Metering |  |
| append_rls_organization_id_on_mppt_insert ON mppts | trigger | public | keep | (1) Production monitoring |  |
| append_rls_organization_id_on_note_insert ON notes | trigger | public | keep | (5) Field ops |  |
| append_rls_organization_id_on_pole_insert ON poles | trigger | public | keep | Platform core |  |
| append_rls_organization_id_on_route_insert ON routers | trigger | public | keep | Platform core | **rename → `append_rls_organization_id_on_router_insert`** (register #10) |
| append_rls_organization_id_on_transaction_insert ON transactions | trigger | public | keep | (3) Payments |  |
| append_rls_organization_id_on_wallet_insert ON wallets | trigger | public | keep | (3) Payments |  |
| autopilot_executions_id_seq | sequence | public | drop |  | register #15 |
| device_logs_id_seq | sequence | public | drop |  | register #12 |
| device_types_id_seq | sequence | public | drop |  | register #12 |
| devices_id_seq | sequence | public | drop |  | register #12 |
| lorawan_directives_id_seq | sequence | public | exclude |  | deprecated table |
| meter_interactions_id_seq | sequence | public | keep | (2) Metering | not owned by serial/identity column |
| pd_action_templates_id_seq | sequence | public | drop |  | register #14 |
| pd_actions_id_seq | sequence | public | drop |  | register #14 |
| pd_audits_id_seq | sequence | public | drop |  | register #14 |
| pd_document_templates_id_seq | sequence | public | drop |  | register #14 |
| pd_documents_id_seq | sequence | public | drop |  | register #14 |
| pd_flow_templates_id_seq | sequence | public | drop |  | register #14 |
| pd_flows_id_seq | sequence | public | drop |  | register #14 |
| pd_section_templates_id_seq | sequence | public | drop |  | register #14 |
| pd_sections_id_seq | sequence | public | drop |  | register #14 |
| pd_site_submissions_id_seq | sequence | public | keep | (5) Field ops | not owned by serial/identity column |
| pd_sites_id_seq | sequence | public | keep | (5) Field ops | not owned by serial/identity column |
| grafana_readonly | role | (cluster) | parameterize |  | optional recipe: `docs/database/optional/grafana-readonly.sql` (role + grants + 15 RLS policies) |
| make_readonly | role | (cluster) | parameterize |  | optional recipe: `docs/database/optional/make-readonly.sql` (role + grants + 4 RLS policies) |
| snaplet_readonly_2 | role | (cluster) | parameterize |  | optional recipe: `docs/database/optional/snaplet-readonly.sql` (role + grants on public + auth) |
| hypopg | extension | extensions | drop |  | v1.4.1; advisor tooling; register #11 — omit from init |
| index_advisor | extension | extensions | drop |  | v0.2.0; advisor tooling; register #11 — omit from init |
| pg_graphql | extension | graphql | drop |  | v1.5.9; off by default on new hosted projects; register #11 — omit from init |
| pg_net | extension | extensions | keep | Platform core | v0.14.0; register #11 — **in init** (`IF NOT EXISTS`) |
| pg_stat_statements | extension | extensions | keep | Platform core | v1.10; Supabase default — **omit from init** (register #11) |
| pgcrypto | extension | extensions | keep | Platform core | v1.3; Supabase default — **omit from init** (register #11) |
| pgjwt | extension | extensions | keep | Platform core | v0.2.0; register #11 — **in init** (`IF NOT EXISTS`) |
| pgsodium | extension | pgsodium | keep | Platform core | v3.1.8; register #11 — **in init** (`IF NOT EXISTS`) |
| postgis | extension | extensions | keep | Platform core | v3.3.7; schema-required; register #11 — **in init** (`IF NOT EXISTS`) |
| supabase_vault | extension | vault | keep | Platform core | v0.2.8; Supabase default — **omit from init** (register #11) |
| uuid-ossp | extension | extensions | keep | Platform core | v1.1; Supabase default — **omit from init** (register #11) |
| (none) | storage bucket | storage | keep | Platform core | placeholder row — no buckets in migration chain; not in init |
| on_auth_user_created ON auth.users | trigger | auth | keep | Platform core | migration-owned; Supabase-managed table |
| on_auth_user_updated ON auth.users | trigger | auth | keep | Platform core | migration-owned; Supabase-managed table |
