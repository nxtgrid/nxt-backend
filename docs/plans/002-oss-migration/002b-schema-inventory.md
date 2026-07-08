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
| audits | table | public |  |  | RLS enabled; 1 policy |
| autopilot_executions | table | public |  |  | RLS enabled |
| bank_accounts | table | public |  |  | RLS enabled |
| banks | table | public |  |  | RLS enabled |
| connection_requested_meters | table | public |  |  | RLS enabled; 2 policies |
| connections | table | public |  |  | RLS enabled; 5 policies |
| customers | table | public |  |  | RLS enabled; 4 policies |
| dcus | table | public | keep | Platform core | RLS enabled; 4 policies; **rename → `gateways`** (register #10) |
| device_logs | table | public | drop |  | RLS enabled; 3 policies; register #12 |
| device_types | table | public | drop |  | RLS enabled; 4 policies; register #12 |
| devices | table | public | drop |  | RLS enabled; 3 policies; register #12 |
| directive_batch_executions | table | public | keep | (2) Metering | RLS enabled; 2 policies; **rename candidate** |
| directive_batches | table | public | keep | (2) Metering | RLS enabled; 3 policies; **rename candidate**; drop `directive_type` column (register #1 §1) |
| directive_watchdog_sessions | table | public | drop |  | RLS enabled; register #4 |
| directives | table | public | exclude |  | RLS enabled; 3 policies |
| energy_cabins | table | public | keep | (1) Production monitoring | RLS enabled; 2 policies; pegasus grid map layer (Supabase read) |
| features | table | public | drop |  | RLS enabled; 2 policies; register #8 |
| grids | table | public | keep | Platform core | RLS enabled; 7 policies; register #10 column renames on `are_all_dcus_*` |
| issues | table | public |  |  | RLS enabled; 2 policies |
| lorawan_directives | table | public | exclude |  | RLS enabled; 3 policies |
| member_feature | table | public | drop |  | RLS enabled; register #8 |
| members | table | public | keep | Platform core | RLS enabled; 2 policies |
| meter_commissionings | table | public |  |  | RLS enabled; 2 policies |
| meter_credit_transfers | table | public | exclude |  | RLS enabled; register #7 |
| meter_interactions | table | public |  |  | RLS enabled; 2 policies |
| metering_hardware_imports | table | public |  |  | RLS enabled; 1 policy |
| metering_hardware_install_sessions | table | public |  |  | RLS enabled; 3 policies |
| meters | table | public | keep | (2) Metering | RLS enabled; 5 policies; drop `current_special_status` (register #1 §1); drop `device_id` (register #12 §4) |
| migrations | table | public | drop |  | RLS enabled; legacy TypeORM ledger; register #9 |
| mppts | table | public | keep | (1) Production monitoring | RLS enabled; 2 policies |
| notes | table | public |  |  | RLS enabled; 5 policies |
| notification_parameters | table | public |  |  | RLS enabled |
| notifications | table | public |  |  | RLS enabled |
| orders | table | public | keep | (3) Payments | RLS enabled; 5 policies; drop `directive_id`, `lorawan_directive_id` (register #1 §1); drop `meter_credit_transfer_id` (register #7 §2) |
| organizations | table | public | keep | Platform core | RLS enabled; 6 policies |
| payouts | table | public |  |  | RLS enabled; 1 policy |
| pd_action_templates | table | public |  |  | RLS enabled; 1 policy |
| pd_actions | table | public |  |  | RLS enabled; 3 policies |
| pd_audits | table | public |  |  | RLS enabled; 1 policy |
| pd_document_templates | table | public |  |  | RLS enabled; 1 policy |
| pd_documents | table | public |  |  | RLS enabled; 2 policies |
| pd_flow_templates | table | public |  |  | RLS enabled; 1 policy |
| pd_flows | table | public |  |  | RLS enabled; 3 policies |
| pd_section_templates | table | public |  |  | RLS enabled |
| pd_sections | table | public |  |  | RLS enabled |
| pd_site_submissions | table | public |  |  | RLS enabled; 3 policies |
| pd_sites | table | public |  |  | RLS enabled; 3 policies |
| poles | table | public | keep | Platform core | RLS enabled; 4 policies |
| routers | table | public | keep | Platform core | RLS enabled; 2 policies |
| solcast_cache | table | public | keep | (1) Production monitoring | RLS enabled |
| transactions | table | public |  |  | RLS enabled; 3 policies |
| ussd_session_hops | table | public |  |  | RLS enabled |
| ussd_sessions | table | public |  |  | RLS enabled |
| wallets | table | public |  |  | RLS enabled; 4 policies |
| agents_with_account | view | public | keep | Platform core | register #10 view column renames (`dcu_*` → `gateway_*`) |
| batch_commands | view | public | exclude |  | UNION over deprecated directive tables |
| customers_with_account | view | public |  |  |  |
| meters_with_account_and_statuses | view | public | keep | (2) Metering | drop `current_special_status` (register #1 §1); drop `device_id` (register #12 §4) |
| account_type_enum | enum | public | keep | Platform core | values: AGENT, MEMBER, CUSTOMER |
| communication_protocol_enum | enum | public |  |  | values: CALIN_V1, CALIN_V2, CALIN_LORAWAN |
| currency_enum | enum | public |  |  | values: USD, NGN, EUR |
| directive_direction_enum | enum | public | exclude |  | values: UP, DOWN |
| directive_error_enum | enum | public | exclude |  | values: GRID_DOWN, DCU_OFFLINE, NO_METER, NO_DCU, NO_GRID, NO_CONNECTION, NO_CUSTOMER |
| directive_phase_enum | enum | public | exclude |  | values: A, B, C |
| directive_special_status_enum | enum | public | exclude |  | values: POWER_LIMIT_BREACHED, CREDIT_EXHAUSTED, …; was on `meters.current_special_status` (dropped) |
| directive_status_enum | enum | public | exclude |  | values: INITIALISED, PENDING, SENT_TO_API, … |
| directive_type_enum | enum | public | exclude |  | values: ON, OFF, READ_VOLTAGE, …; was on `directive_batches.directive_type` (dropped) |
| external_system_enum | enum | public | keep | Platform core | values: STEAMACO, CALIN, …; enum value trim deferred |
| fs_command_type_enum | enum | public |  |  | values: ON, OFF |
| gender_enum | enum | public |  |  | values: MALE, FEMALE |
| generator_type_enum | enum | public |  |  | values: SMALL, LARGE |
| id_document_type_enum | enum | public |  |  | values: PASSPORT, NATIONAL_ID, DRIVING_LICENSE, VOTERS_CARD |
| issue_status_enum | enum | public |  |  | values: OPEN, CLOSED, OVERRIDDEN |
| issue_type_enum | enum | public |  |  | values: NO_COMMUNICATION, METER_NOT_ACTIVATED, TAMPER, POWER_LIMIT_BREACHED, OVER_VOLTAGE, LOW_VOLTAGE, POWER_LIMIT_BAD_CONFIGURATION, METER_STATE_BAD_CONFIGURATION, UNEXPECTED_POWER_LIMIT, UNEXPECTED_METER_STATUS, NO_CREDIT, NO_CONSUMPTION, NUMBER_OF_PHASES, VEBUS_STATE, VEBUS_ERROR, QUATTRO_TEMPERATURE_ALARM, QUATTRO_OVERLOAD_ALARM, HIGH_BATTERY_TEMPERATURE_ALARM, CELL_IMBALANCE_ALARM, HIGH_CHARGE_CURRENT_ALARM, HIGH_CHARGE_TEMPERATURE_ALARM, BATTERY_INTERNAL_FAILURE, BATTERY_CHARGE_BLOCKED_ALARM, BATTERY_DISCHARGE_BLOCKED_ALARM |
| member_type_enum | enum | public | keep | Platform core | values: SUPERADMIN, ADMIN, PARTNER, … |
| meter_commissioning_status_enum | enum | public |  |  | values: PENDING, PROCESSING, SUCCESSFUL, FAILED |
| meter_credit_transfer_status_enum | enum | public | exclude |  | values: PENDING, PROCESSING, SUCCESSFUL, FAILED; register #7 |
| meter_interaction_status_enum | enum | public |  |  | values: QUEUED, ABORTED, PROCESSING, SUCCESSFUL, FAILED, DEFERRED, SUSPENDED |
| meter_interaction_type_enum | enum | public |  |  | values: READ_CREDIT, READ_POWER_LIMIT, READ_VOLTAGE, SET_POWER_LIMIT, TOP_UP, TURN_ON, TURN_OFF, READ_POWER, READ_CURRENT, CLEAR_CREDIT, CLEAR_TAMPER, READ_REPORT, JOIN_NETWORK, DELIVER_PREEXISTING_TOKEN, READ_VERSION, READ_DATE, SET_DATE, READ_TIME, SET_TIME |
| meter_phase_enum | enum | public |  |  | values: SINGLE_PHASE, THREE_PHASE |
| meter_type_enum | enum | public |  |  | values: HPS, FS |
| mhi_operation_enum | enum | public |  |  | values: ADD, REMOVE |
| mhi_status_enum | enum | public |  |  | values: PENDING, PROCESSING, SUCCESSFUL, FAILED |
| mppt_type_enum | enum | public | keep | (1) Production monitoring | values: MPPT, PV_INVERTER |
| notification_status_enum | enum | public |  |  | values: PENDING, PROCESSING, RECEIVED_BY_API, FAILED, SUCCESSFUL, READ, UNKNOWN |
| notification_type_enum | enum | public |  |  | values: GRID_IS_HPS_ON_STATE_CHANGE, GRID_IS_FS_ON_STATE_CHANGE, GRID_METERING_HARDWARE_STATE_CHANGE, FS_RULE_EXECUTION_COMING_UP, FS_RULE_CHANGED, TARIFF_RULE_CHANGED, CLEAN_PANELS_REMINDER, GRID_REVENUE, PASSWORD_RESET, INVITE, AUTO_PAYOUT_GENRATION_REPORT, CREDIT_SENT, CREDIT_RECEIVED, METER_TOPPED_UP, PAYMENT_REJECTED, SITE_SUBMISSION |
| order_actor_type_enum | enum | public |  |  | values: BANKING_SYSTEM, ORGANIZATION, CONNECTION, METER, AGENT, CUSTOMER |
| order_status_enum | enum | public |  |  | values: INITIALISED, PENDING, COMPLETED, FAILED, CANCELLED, TIMED_OUT, IGNORED |
| order_type_enum | enum | public |  |  | values: ENERGY_TOPUP, CONNECTION_PAYMENT, CONNECTION_REFUND, AGENT_WITHDRAWAL, AGENT_TOPUP, ORGANIZATION_TOPUP, ORGANIZATION_WITHDRAWAL, CUSTOMER_TOPUP |
| organization_type_enum | enum | public | keep | Platform core | values: SOLAR_DEVELOPER, LENDER, DATA_AGGREGATOR |
| payment_channel_enum | enum | public |  |  | values: USSD, AYRTON, NIFFLER, TELEGRAM |
| payment_method_enum | enum | public |  |  | values: CREDIT_CARD, USSD, BANK_TRANSFER |
| payout_status_enum | enum | public |  |  | values: INITIALISED, WAITING_FOR_APPROVAL, PROCESSING, SUCCESSFUL, FAILED |
| pd_action_status_enum | enum | public |  |  | values: GENERATING, GENERATION_FAILED, GENERATION_COMPLETED, ACTIONABLE, ACTION_COMPLETED |
| pd_action_type_enum | enum | public |  |  | values: UPLOAD, TEMPLATE, EXTERNAL, START, END |
| pd_document_type_enum | enum | public |  |  | values: GOOGLE_SHEETS, GOOGLE_DOCS |
| solcast_cache_request_type_enum | enum | public | keep | (1) Production monitoring | values: ESTIMATED_ACTUALS, FORECAST |
| transaction_status_enum | enum | public |  |  | values: SUCCESSFUL, FAILED |
| wallet_type_enum | enum | public |  |  | values: VIRTUAL, REAL |
| weather_type_enum | enum | public | keep | Platform core | values: CLOUDY, CLOUDS, SHOWERS, SUNNY, … |
| append_rls_organization_id_by_account_id() | function | public | keep | Platform core | member insert trigger |
| append_rls_organization_id_by_connection_id() | function | public |  |  |  |
| append_rls_organization_id_by_customer_id() | function | public |  |  |  |
| append_rls_organization_id_by_customer_id_or_agent_id_or_connec() | function | public |  |  |  |
| append_rls_organization_id_by_dcu_id_or_meter_id() | function | public | keep | Platform core | **rename → `…_by_gateway_id_or_meter_id`** (register #10) |
| append_rls_organization_id_by_device_id() | function | public | drop |  | register #12 |
| append_rls_organization_id_by_directive_batch_id() | function | public |  |  |  |
| append_rls_organization_id_by_grid_id() | function | public | keep | Platform core | grid-scoped entity inserts |
| append_rls_organization_id_by_historical_grid_id() | function | public | keep | Platform core | orphan — no trigger in chain; review in Task 3b |
| append_rls_organization_id_by_meter_id() | function | public |  |  |  |
| append_rls_organization_id_by_metering_hardware_install_session() | function | public |  |  |  |
| append_rls_organization_id_by_order_id() | function | public |  |  |  |
| append_rls_organization_id_by_receiver_meter_id() | function | public | exclude |  | only used by excluded `meter_credit_transfers` trigger; register #7 |
| find_energy_topup_revenue(grid_id integer, start_date timestamp with time zone, end_date timestamp with time zone) | function | public |  |  |  |
| find_top_spenders(grid_id integer, limit_count integer, start_date timestamp with time zone, end_date timestamp with time zone) | function | public |  |  |  |
| get_grid_status(grid_id integer) | function | public | keep | (1) Production monitoring | pegasus grid dashboard RPC; register #10 return column renames |
| handle_new_user() | function | public | keep | Platform core | auth.users trigger |
| handle_update_user() | function | public | keep | Platform core | auth.users trigger |
| lock_next_order(uuid uuid) | function | public |  |  |  |
| lock_next_order_and_wallets(uuid uuid) | function | public |  |  |  |
| lock_next_pd_action() | function | public |  |  |  |
| notify_make_about_is_fs_on_updated() | function | public | parameterize |  | optional recipe: `docs/database/optional/make-grid-triggers.sql` |
| notify_make_about_is_hps_on_updated() | function | public | parameterize |  | optional recipe: `docs/database/optional/make-grid-triggers.sql` |
| notify_make_about_kwh_tariff_essential_service_updated() | function | public | parameterize |  | optional recipe: `docs/database/optional/make-grid-triggers.sql` |
| rls_check_if_lender() | function | public | keep | Platform core | RLS helper |
| rls_check_if_nxt_member() | function | public | keep | Platform core | RLS helper |
| rls_get_member_org_id() | function | public | keep | Platform core | RLS helper |
| append_rls_organization_id_on_agent_insert ON agents | trigger | public | keep | Platform core |  |
| append_rls_organization_id_on_requested_connection_meters_inser ON connection_requested_meters | trigger | public |  |  | CREATE TRIGGER append_rls_organization_id_on_requested_connection_meters_inser BEFORE INSERT ON connection_requested_meters FOR EACH ROW EXECUTE FUNCTION append_rls_organization_id_by_connection_id() |
| append_rls_organization_id_on_connection_insert ON connections | trigger | public |  |  | CREATE TRIGGER append_rls_organization_id_on_connection_insert BEFORE INSERT ON connections FOR EACH ROW EXECUTE FUNCTION append_rls_organization_id_by_customer_id() |
| append_rls_organization_id_on_customer_insert ON customers | trigger | public |  |  | CREATE TRIGGER append_rls_organization_id_on_customer_insert BEFORE INSERT ON customers FOR EACH ROW EXECUTE FUNCTION append_rls_organization_id_by_grid_id() |
| append_rls_organization_id_on_dcus_insert ON dcus | trigger | public | keep | Platform core | **rename → `…_on_gateways_insert` ON `gateways`** (register #10) |
| append_rls_organization_id_by_device_id ON device_logs | trigger | public | drop |  | register #12 |
| append_rls_organization_id_on_devices_insert ON devices | trigger | public | drop |  | register #12 |
| append_rls_organization_id_on_directive_batch_execution_insert ON directive_batch_executions | trigger | public |  |  | CREATE TRIGGER append_rls_organization_id_on_directive_batch_execution_insert BEFORE INSERT ON directive_batch_executions FOR EACH ROW EXECUTE FUNCTION append_rls_organization_id_by_directive_batch_id() |
| append_rls_organization_id_on_directive_batch_insert ON directive_batches | trigger | public |  |  | CREATE TRIGGER append_rls_organization_id_on_directive_batch_insert BEFORE INSERT ON directive_batches FOR EACH ROW EXECUTE FUNCTION append_rls_organization_id_by_grid_id() |
| append_rls_organization_id_on_directive_insert ON directives | trigger | public | exclude |  | deprecated table |
| append_rls_organization_id_on_energy_cabin_insert ON energy_cabins | trigger | public | keep | (1) Production monitoring | on keep table `energy_cabins` |
| notify_make_about_is_fs_on_updated ON grids | trigger | public | parameterize |  | optional recipe: `docs/database/optional/make-grid-triggers.sql` |
| notify_make_about_is_hps_on_updated ON grids | trigger | public | parameterize |  | optional recipe: `docs/database/optional/make-grid-triggers.sql` |
| notify_make_about_kwh_tariff_essential_service_updated ON grids | trigger | public | parameterize |  | optional recipe: `docs/database/optional/make-grid-triggers.sql` |
| append_rls_organization_id_on_issue_insert ON issues | trigger | public |  |  | CREATE TRIGGER append_rls_organization_id_on_issue_insert BEFORE INSERT ON issues FOR EACH ROW EXECUTE FUNCTION append_rls_organization_id_by_meter_id() |
| append_rls_organization_id_on_lorawan_directive_insert ON lorawan_directives | trigger | public | exclude |  | deprecated table |
| append_rls_organization_id_on_member_insert ON members | trigger | public | keep | Platform core |  |
| append_rls_organization_id_on_meter_commissioning_insert ON meter_commissionings | trigger | public |  |  | CREATE TRIGGER append_rls_organization_id_on_meter_commissioning_insert BEFORE INSERT ON meter_commissionings FOR EACH ROW EXECUTE FUNCTION append_rls_organization_id_by_metering_hardware_install_session() |
| append_rls_organization_id_on_meter_credit_transfer_insert ON meter_credit_transfers | trigger | public | exclude |  | register #7 |
| append_rls_organization_id_on_meter_install_session_insert ON metering_hardware_install_sessions | trigger | public |  |  | CREATE TRIGGER append_rls_organization_id_on_meter_install_session_insert BEFORE INSERT ON metering_hardware_install_sessions FOR EACH ROW EXECUTE FUNCTION append_rls_organization_id_by_dcu_id_or_meter_id() |
| append_rls_organization_id_on_meter_insert ON meters | trigger | public |  |  | CREATE TRIGGER append_rls_organization_id_on_meter_insert BEFORE INSERT ON meters FOR EACH ROW EXECUTE FUNCTION append_rls_organization_id_by_connection_id() |
| append_rls_organization_id_on_mppt_insert ON mppts | trigger | public | keep | (1) Production monitoring |  |
| append_rls_organization_id_on_note_insert ON notes | trigger | public |  |  | CREATE TRIGGER append_rls_organization_id_on_note_insert BEFORE INSERT ON notes FOR EACH ROW EXECUTE FUNCTION append_rls_organization_id_by_customer_id() |
| append_rls_organization_id_on_pole_insert ON poles | trigger | public | keep | Platform core |  |
| append_rls_organization_id_on_route_insert ON routers | trigger | public | keep | Platform core | **rename → `…_on_router_insert`** (register #10) |
| append_rls_organization_id_on_transaction_insert ON transactions | trigger | public |  |  | CREATE TRIGGER append_rls_organization_id_on_transaction_insert BEFORE INSERT ON transactions FOR EACH ROW EXECUTE FUNCTION append_rls_organization_id_by_order_id() |
| append_rls_organization_id_on_wallet_insert ON wallets | trigger | public |  |  | CREATE TRIGGER append_rls_organization_id_on_wallet_insert BEFORE INSERT ON wallets FOR EACH ROW EXECUTE FUNCTION append_rls_organization_id_by_customer_id_or_agent_id_or_connec() |
| autopilot_executions_id_seq | sequence | public |  |  | not owned by serial/identity column |
| device_logs_id_seq | sequence | public | drop |  | register #12 |
| device_types_id_seq | sequence | public | drop |  | register #12 |
| devices_id_seq | sequence | public | drop |  | register #12 |
| lorawan_directives_id_seq | sequence | public | exclude |  | deprecated table |
| meter_interactions_id_seq | sequence | public |  |  | not owned by serial/identity column |
| pd_action_templates_id_seq | sequence | public |  |  | not owned by serial/identity column |
| pd_actions_id_seq | sequence | public |  |  | not owned by serial/identity column |
| pd_audits_id_seq | sequence | public |  |  | not owned by serial/identity column |
| pd_document_templates_id_seq | sequence | public |  |  | not owned by serial/identity column |
| pd_documents_id_seq | sequence | public |  |  | not owned by serial/identity column |
| pd_flow_templates_id_seq | sequence | public |  |  | not owned by serial/identity column |
| pd_flows_id_seq | sequence | public |  |  | not owned by serial/identity column |
| pd_section_templates_id_seq | sequence | public |  |  | not owned by serial/identity column |
| pd_sections_id_seq | sequence | public |  |  | not owned by serial/identity column |
| pd_site_submissions_id_seq | sequence | public |  |  | not owned by serial/identity column |
| pd_sites_id_seq | sequence | public |  |  | not owned by serial/identity column |
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
