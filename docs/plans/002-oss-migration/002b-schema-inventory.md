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
| accounts | table | public |  |  | RLS enabled; 6 policies |
| agents | table | public |  |  | RLS enabled; 2 policies |
| api_keys | table | public |  |  | RLS enabled |
| audits | table | public |  |  | RLS enabled; 1 policy |
| autopilot_executions | table | public |  |  | RLS enabled |
| bank_accounts | table | public |  |  | RLS enabled |
| banks | table | public |  |  | RLS enabled |
| connection_requested_meters | table | public |  |  | RLS enabled; 2 policies |
| connections | table | public |  |  | RLS enabled; 5 policies |
| customers | table | public |  |  | RLS enabled; 4 policies |
| dcus | table | public |  |  | RLS enabled; 4 policies |
| device_logs | table | public |  |  | RLS enabled; 3 policies |
| device_types | table | public |  |  | RLS enabled; 4 policies |
| devices | table | public |  |  | RLS enabled; 3 policies |
| directive_batch_executions | table | public |  |  | RLS enabled; 2 policies |
| directive_batches | table | public |  |  | RLS enabled; 3 policies |
| directive_watchdog_sessions | table | public |  |  | RLS enabled |
| directives | table | public |  |  | RLS enabled; 3 policies |
| energy_cabins | table | public |  |  | RLS enabled; 2 policies |
| features | table | public |  |  | RLS enabled; 2 policies |
| grids | table | public |  |  | RLS enabled; 7 policies |
| issues | table | public |  |  | RLS enabled; 2 policies |
| lorawan_directives | table | public |  |  | RLS enabled; 3 policies |
| member_feature | table | public |  |  | RLS enabled |
| members | table | public |  |  | RLS enabled; 2 policies |
| meter_commissionings | table | public |  |  | RLS enabled; 2 policies |
| meter_credit_transfers | table | public |  |  | RLS enabled |
| meter_interactions | table | public |  |  | RLS enabled; 2 policies |
| metering_hardware_imports | table | public |  |  | RLS enabled; 1 policy |
| metering_hardware_install_sessions | table | public |  |  | RLS enabled; 3 policies |
| meters | table | public |  |  | RLS enabled; 5 policies |
| migrations | table | public |  |  | RLS enabled |
| mppts | table | public |  |  | RLS enabled; 2 policies |
| notes | table | public |  |  | RLS enabled; 5 policies |
| notification_parameters | table | public |  |  | RLS enabled |
| notifications | table | public |  |  | RLS enabled |
| orders | table | public |  |  | RLS enabled; 5 policies |
| organizations | table | public |  |  | RLS enabled; 6 policies |
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
| poles | table | public |  |  | RLS enabled; 4 policies |
| routers | table | public |  |  | RLS enabled; 2 policies |
| solcast_cache | table | public |  |  | RLS enabled |
| transactions | table | public |  |  | RLS enabled; 3 policies |
| ussd_session_hops | table | public |  |  | RLS enabled |
| ussd_sessions | table | public |  |  | RLS enabled |
| wallets | table | public |  |  | RLS enabled; 4 policies |
| agents_with_account | view | public |  |  |  |
| batch_commands | view | public |  |  |  |
| customers_with_account | view | public |  |  |  |
| meters_with_account_and_statuses | view | public |  |  |  |
| account_type_enum | enum | public |  |  | values: AGENT, MEMBER, CUSTOMER |
| communication_protocol_enum | enum | public |  |  | values: CALIN_V1, CALIN_V2, CALIN_LORAWAN |
| currency_enum | enum | public |  |  | values: USD, NGN, EUR |
| directive_direction_enum | enum | public |  |  | values: UP, DOWN |
| directive_error_enum | enum | public |  |  | values: GRID_DOWN, DCU_OFFLINE, NO_METER, NO_DCU, NO_GRID, NO_CONNECTION, NO_CUSTOMER |
| directive_phase_enum | enum | public |  |  | values: A, B, C |
| directive_special_status_enum | enum | public |  |  | values: POWER_LIMIT_BREACHED, CREDIT_EXHAUSTED, REMOTE_SWITCHED_OFF, OVER_VOLTAGE, METER_NOT_ACTIVATED, TAMPER, LOW_VOLTAGE |
| directive_status_enum | enum | public |  |  | values: INITIALISED, PENDING, SENT_TO_API, RECEIVED_BY_API, SENT_TO_DCU, RECEIVED_BY_DCU, SENT_TO_METER, RECEIVED_BY_METER, SUCCESSFUL, FAILED, IGNORED, CANCELLED, TIMED_OUT, UNKNOWN |
| directive_type_enum | enum | public |  |  | values: ON, OFF, READ_VOLTAGE, PLS, PLR, CLEAR_TAMPER, READ_METER_VERSION, TOP_UP, READ_CURRENT_CREDIT, READ_CURRENT, READ_POWER, READ_SPECIAL_STATUS, CLEAR_CREDIT, READ_RELAY_STATUS, READ_POWER_DOWN_COUNT, READ_TIME, READ_DATE, READ_VOLTAGE_A, READ_VOLTAGE_B, READ_VOLTAGE_C, READ_POWER_A, READ_POWER_B, READ_POWER_C, READ_CURRENT_A, READ_CURRENT_B, READ_CURRENT_C, READ_TOTAL_ACTIVE_KWH, READ_STATUS, SEND_TOKEN, READ_FRAUD_STATUS, READ_REPORT, WRITE_DATE, WRITE_TIME, CLEAR_TAMPER_TOKEN, READ_REPORT_UP, READ_REPORT_DOWN, READ_CREDIT_DOWN, READ_CREDIT_UP, READ_VOLTAGE_UP, READ_VOLTAGE_DOWN, READ_POWER_UP, READ_POWER_DOWN, READ_CURRENT_UP, READ_CURRENT_DOWN, CLEAR_TAMPER_UP, CLEAR_TAMPER_DOWN, TOP_UP_DOWN, POWER_LIMIT_SET_UP, POWER_LIMIT_SET_DOWN, OPEN_RELAY_UP, OPEN_RELAY_DOWN, CLOSE_RELAY_UP, CLOSE_RELAY_DOWN, READ_VOLTAGE_A_UP, READ_VOLTAGE_A_DOWN, READ_POWER_A_UP, READ_POWER_A_DOWN, READ_CURRENT_A_UP, READ_CURRENT_A_DOWN, UNKNOWN, CLEAR_CREDIT_DOWN, TOP_UP_KWH, TOKEN_ACCEPTED, TOKEN_REJECTED, ON_OFF_ACCEPTED, ON_OFF_REJECTED |
| external_system_enum | enum | public |  |  | values: STEAMACO, CALIN, SOLCAST, VICTRON, FLUTTERWAVE, AFRICASTALKING, JOTFORM, EPICOLLECT, JIRA, TELEGRAM, ZEROTIER, MAKE, FLOW_XO, SENDGRID, ACREL |
| fs_command_type_enum | enum | public |  |  | values: ON, OFF |
| gender_enum | enum | public |  |  | values: MALE, FEMALE |
| generator_type_enum | enum | public |  |  | values: SMALL, LARGE |
| id_document_type_enum | enum | public |  |  | values: PASSPORT, NATIONAL_ID, DRIVING_LICENSE, VOTERS_CARD |
| issue_status_enum | enum | public |  |  | values: OPEN, CLOSED, OVERRIDDEN |
| issue_type_enum | enum | public |  |  | values: NO_COMMUNICATION, METER_NOT_ACTIVATED, TAMPER, POWER_LIMIT_BREACHED, OVER_VOLTAGE, LOW_VOLTAGE, POWER_LIMIT_BAD_CONFIGURATION, METER_STATE_BAD_CONFIGURATION, UNEXPECTED_POWER_LIMIT, UNEXPECTED_METER_STATUS, NO_CREDIT, NO_CONSUMPTION, NUMBER_OF_PHASES, VEBUS_STATE, VEBUS_ERROR, QUATTRO_TEMPERATURE_ALARM, QUATTRO_OVERLOAD_ALARM, HIGH_BATTERY_TEMPERATURE_ALARM, CELL_IMBALANCE_ALARM, HIGH_CHARGE_CURRENT_ALARM, HIGH_CHARGE_TEMPERATURE_ALARM, BATTERY_INTERNAL_FAILURE, BATTERY_CHARGE_BLOCKED_ALARM, BATTERY_DISCHARGE_BLOCKED_ALARM |
| member_type_enum | enum | public |  |  | values: SUPERADMIN, ADMIN, PARTNER, FINANCE, DEVELOPER, MANAGER, SUPPORT, SERVICE, SALES, TECH |
| meter_commissioning_status_enum | enum | public |  |  | values: PENDING, PROCESSING, SUCCESSFUL, FAILED |
| meter_credit_transfer_status_enum | enum | public |  |  | values: PENDING, PROCESSING, SUCCESSFUL, FAILED |
| meter_interaction_status_enum | enum | public |  |  | values: QUEUED, ABORTED, PROCESSING, SUCCESSFUL, FAILED, DEFERRED, SUSPENDED |
| meter_interaction_type_enum | enum | public |  |  | values: READ_CREDIT, READ_POWER_LIMIT, READ_VOLTAGE, SET_POWER_LIMIT, TOP_UP, TURN_ON, TURN_OFF, READ_POWER, READ_CURRENT, CLEAR_CREDIT, CLEAR_TAMPER, READ_REPORT, JOIN_NETWORK, DELIVER_PREEXISTING_TOKEN, READ_VERSION, READ_DATE, SET_DATE, READ_TIME, SET_TIME |
| meter_phase_enum | enum | public |  |  | values: SINGLE_PHASE, THREE_PHASE |
| meter_type_enum | enum | public |  |  | values: HPS, FS |
| mhi_operation_enum | enum | public |  |  | values: ADD, REMOVE |
| mhi_status_enum | enum | public |  |  | values: PENDING, PROCESSING, SUCCESSFUL, FAILED |
| mppt_type_enum | enum | public |  |  | values: MPPT, PV_INVERTER |
| notification_status_enum | enum | public |  |  | values: PENDING, PROCESSING, RECEIVED_BY_API, FAILED, SUCCESSFUL, READ, UNKNOWN |
| notification_type_enum | enum | public |  |  | values: GRID_IS_HPS_ON_STATE_CHANGE, GRID_IS_FS_ON_STATE_CHANGE, GRID_METERING_HARDWARE_STATE_CHANGE, FS_RULE_EXECUTION_COMING_UP, FS_RULE_CHANGED, TARIFF_RULE_CHANGED, CLEAN_PANELS_REMINDER, GRID_REVENUE, PASSWORD_RESET, INVITE, AUTO_PAYOUT_GENRATION_REPORT, CREDIT_SENT, CREDIT_RECEIVED, METER_TOPPED_UP, PAYMENT_REJECTED, SITE_SUBMISSION |
| order_actor_type_enum | enum | public |  |  | values: BANKING_SYSTEM, ORGANIZATION, CONNECTION, METER, AGENT, CUSTOMER |
| order_status_enum | enum | public |  |  | values: INITIALISED, PENDING, COMPLETED, FAILED, CANCELLED, TIMED_OUT, IGNORED |
| order_type_enum | enum | public |  |  | values: ENERGY_TOPUP, CONNECTION_PAYMENT, CONNECTION_REFUND, AGENT_WITHDRAWAL, AGENT_TOPUP, ORGANIZATION_TOPUP, ORGANIZATION_WITHDRAWAL, CUSTOMER_TOPUP |
| organization_type_enum | enum | public |  |  | values: SOLAR_DEVELOPER, LENDER, DATA_AGGREGATOR |
| payment_channel_enum | enum | public |  |  | values: USSD, AYRTON, NIFFLER, TELEGRAM |
| payment_method_enum | enum | public |  |  | values: CREDIT_CARD, USSD, BANK_TRANSFER |
| payout_status_enum | enum | public |  |  | values: INITIALISED, WAITING_FOR_APPROVAL, PROCESSING, SUCCESSFUL, FAILED |
| pd_action_status_enum | enum | public |  |  | values: GENERATING, GENERATION_FAILED, GENERATION_COMPLETED, ACTIONABLE, ACTION_COMPLETED |
| pd_action_type_enum | enum | public |  |  | values: UPLOAD, TEMPLATE, EXTERNAL, START, END |
| pd_document_type_enum | enum | public |  |  | values: GOOGLE_SHEETS, GOOGLE_DOCS |
| solcast_cache_request_type_enum | enum | public |  |  | values: ESTIMATED_ACTUALS, FORECAST |
| transaction_status_enum | enum | public |  |  | values: SUCCESSFUL, FAILED |
| wallet_type_enum | enum | public |  |  | values: VIRTUAL, REAL |
| weather_type_enum | enum | public |  |  | values: CLOUDY, CLOUDS, SHOWERS, SUNNY, UNKNOWN, CLOUDY_WITH_RAIN |
| append_rls_organization_id_by_account_id() | function | public |  |  |  |
| append_rls_organization_id_by_connection_id() | function | public |  |  |  |
| append_rls_organization_id_by_customer_id() | function | public |  |  |  |
| append_rls_organization_id_by_customer_id_or_agent_id_or_connec() | function | public |  |  |  |
| append_rls_organization_id_by_dcu_id_or_meter_id() | function | public |  |  |  |
| append_rls_organization_id_by_device_id() | function | public |  |  |  |
| append_rls_organization_id_by_directive_batch_id() | function | public |  |  |  |
| append_rls_organization_id_by_grid_id() | function | public |  |  |  |
| append_rls_organization_id_by_historical_grid_id() | function | public |  |  |  |
| append_rls_organization_id_by_meter_id() | function | public |  |  |  |
| append_rls_organization_id_by_metering_hardware_install_session() | function | public |  |  |  |
| append_rls_organization_id_by_order_id() | function | public |  |  |  |
| append_rls_organization_id_by_receiver_meter_id() | function | public |  |  |  |
| find_energy_topup_revenue(grid_id integer, start_date timestamp with time zone, end_date timestamp with time zone) | function | public |  |  |  |
| find_top_spenders(grid_id integer, limit_count integer, start_date timestamp with time zone, end_date timestamp with time zone) | function | public |  |  |  |
| get_grid_status(grid_id integer) | function | public |  |  |  |
| handle_new_user() | function | public |  |  |  |
| handle_update_user() | function | public |  |  |  |
| lock_next_order(uuid uuid) | function | public |  |  |  |
| lock_next_order_and_wallets(uuid uuid) | function | public |  |  |  |
| lock_next_pd_action() | function | public |  |  |  |
| notify_make_about_is_fs_on_updated() | function | public |  |  |  |
| notify_make_about_is_hps_on_updated() | function | public |  |  |  |
| notify_make_about_kwh_tariff_essential_service_updated() | function | public |  |  |  |
| rls_check_if_lender() | function | public |  |  |  |
| rls_check_if_nxt_member() | function | public |  |  |  |
| rls_get_member_org_id() | function | public |  |  |  |
| append_rls_organization_id_on_agent_insert ON agents | trigger | public |  |  | CREATE TRIGGER append_rls_organization_id_on_agent_insert BEFORE INSERT ON agents FOR EACH ROW EXECUTE FUNCTION append_rls_organization_id_by_grid_id() |
| append_rls_organization_id_on_requested_connection_meters_inser ON connection_requested_meters | trigger | public |  |  | CREATE TRIGGER append_rls_organization_id_on_requested_connection_meters_inser BEFORE INSERT ON connection_requested_meters FOR EACH ROW EXECUTE FUNCTION append_rls_organization_id_by_connection_id() |
| append_rls_organization_id_on_connection_insert ON connections | trigger | public |  |  | CREATE TRIGGER append_rls_organization_id_on_connection_insert BEFORE INSERT ON connections FOR EACH ROW EXECUTE FUNCTION append_rls_organization_id_by_customer_id() |
| append_rls_organization_id_on_customer_insert ON customers | trigger | public |  |  | CREATE TRIGGER append_rls_organization_id_on_customer_insert BEFORE INSERT ON customers FOR EACH ROW EXECUTE FUNCTION append_rls_organization_id_by_grid_id() |
| append_rls_organization_id_on_dcus_insert ON dcus | trigger | public |  |  | CREATE TRIGGER append_rls_organization_id_on_dcus_insert BEFORE INSERT ON dcus FOR EACH ROW EXECUTE FUNCTION append_rls_organization_id_by_grid_id() |
| append_rls_organization_id_by_device_id ON device_logs | trigger | public |  |  | CREATE TRIGGER append_rls_organization_id_by_device_id BEFORE INSERT ON device_logs FOR EACH ROW EXECUTE FUNCTION append_rls_organization_id_by_device_id() |
| append_rls_organization_id_on_devices_insert ON devices | trigger | public |  |  | CREATE TRIGGER append_rls_organization_id_on_devices_insert BEFORE INSERT ON devices FOR EACH ROW EXECUTE FUNCTION append_rls_organization_id_by_grid_id() |
| append_rls_organization_id_on_directive_batch_execution_insert ON directive_batch_executions | trigger | public |  |  | CREATE TRIGGER append_rls_organization_id_on_directive_batch_execution_insert BEFORE INSERT ON directive_batch_executions FOR EACH ROW EXECUTE FUNCTION append_rls_organization_id_by_directive_batch_id() |
| append_rls_organization_id_on_directive_batch_insert ON directive_batches | trigger | public |  |  | CREATE TRIGGER append_rls_organization_id_on_directive_batch_insert BEFORE INSERT ON directive_batches FOR EACH ROW EXECUTE FUNCTION append_rls_organization_id_by_grid_id() |
| append_rls_organization_id_on_directive_insert ON directives | trigger | public |  |  | CREATE TRIGGER append_rls_organization_id_on_directive_insert BEFORE INSERT ON directives FOR EACH ROW EXECUTE FUNCTION append_rls_organization_id_by_meter_id() |
| append_rls_organization_id_on_energy_cabin_insert ON energy_cabins | trigger | public |  |  | CREATE TRIGGER append_rls_organization_id_on_energy_cabin_insert BEFORE INSERT ON energy_cabins FOR EACH ROW EXECUTE FUNCTION append_rls_organization_id_by_grid_id() |
| notify_make_about_is_fs_on_updated ON grids | trigger | public |  |  | CREATE TRIGGER notify_make_about_is_fs_on_updated AFTER UPDATE ON grids FOR EACH ROW EXECUTE FUNCTION notify_make_about_is_fs_on_updated() |
| notify_make_about_is_hps_on_updated ON grids | trigger | public |  |  | CREATE TRIGGER notify_make_about_is_hps_on_updated AFTER UPDATE ON grids FOR EACH ROW EXECUTE FUNCTION notify_make_about_is_hps_on_updated() |
| notify_make_about_kwh_tariff_essential_service_updated ON grids | trigger | public |  |  | CREATE TRIGGER notify_make_about_kwh_tariff_essential_service_updated AFTER UPDATE ON grids FOR EACH ROW EXECUTE FUNCTION notify_make_about_kwh_tariff_essential_service_updated() |
| append_rls_organization_id_on_issue_insert ON issues | trigger | public |  |  | CREATE TRIGGER append_rls_organization_id_on_issue_insert BEFORE INSERT ON issues FOR EACH ROW EXECUTE FUNCTION append_rls_organization_id_by_meter_id() |
| append_rls_organization_id_on_lorawan_directive_insert ON lorawan_directives | trigger | public |  |  | CREATE TRIGGER append_rls_organization_id_on_lorawan_directive_insert BEFORE INSERT ON lorawan_directives FOR EACH ROW EXECUTE FUNCTION append_rls_organization_id_by_meter_id() |
| append_rls_organization_id_on_member_insert ON members | trigger | public |  |  | CREATE TRIGGER append_rls_organization_id_on_member_insert BEFORE INSERT ON members FOR EACH ROW EXECUTE FUNCTION append_rls_organization_id_by_account_id() |
| append_rls_organization_id_on_meter_commissioning_insert ON meter_commissionings | trigger | public |  |  | CREATE TRIGGER append_rls_organization_id_on_meter_commissioning_insert BEFORE INSERT ON meter_commissionings FOR EACH ROW EXECUTE FUNCTION append_rls_organization_id_by_metering_hardware_install_session() |
| append_rls_organization_id_on_meter_credit_transfer_insert ON meter_credit_transfers | trigger | public |  |  | CREATE TRIGGER append_rls_organization_id_on_meter_credit_transfer_insert BEFORE INSERT ON meter_credit_transfers FOR EACH ROW EXECUTE FUNCTION append_rls_organization_id_by_receiver_meter_id() |
| append_rls_organization_id_on_meter_install_session_insert ON metering_hardware_install_sessions | trigger | public |  |  | CREATE TRIGGER append_rls_organization_id_on_meter_install_session_insert BEFORE INSERT ON metering_hardware_install_sessions FOR EACH ROW EXECUTE FUNCTION append_rls_organization_id_by_dcu_id_or_meter_id() |
| append_rls_organization_id_on_meter_insert ON meters | trigger | public |  |  | CREATE TRIGGER append_rls_organization_id_on_meter_insert BEFORE INSERT ON meters FOR EACH ROW EXECUTE FUNCTION append_rls_organization_id_by_connection_id() |
| append_rls_organization_id_on_mppt_insert ON mppts | trigger | public |  |  | CREATE TRIGGER append_rls_organization_id_on_mppt_insert BEFORE INSERT ON mppts FOR EACH ROW EXECUTE FUNCTION append_rls_organization_id_by_grid_id() |
| append_rls_organization_id_on_note_insert ON notes | trigger | public |  |  | CREATE TRIGGER append_rls_organization_id_on_note_insert BEFORE INSERT ON notes FOR EACH ROW EXECUTE FUNCTION append_rls_organization_id_by_customer_id() |
| append_rls_organization_id_on_pole_insert ON poles | trigger | public |  |  | CREATE TRIGGER append_rls_organization_id_on_pole_insert BEFORE INSERT ON poles FOR EACH ROW EXECUTE FUNCTION append_rls_organization_id_by_grid_id() |
| append_rls_organization_id_on_route_insert ON routers | trigger | public |  |  | CREATE TRIGGER append_rls_organization_id_on_route_insert BEFORE INSERT ON routers FOR EACH ROW EXECUTE FUNCTION append_rls_organization_id_by_grid_id() |
| append_rls_organization_id_on_transaction_insert ON transactions | trigger | public |  |  | CREATE TRIGGER append_rls_organization_id_on_transaction_insert BEFORE INSERT ON transactions FOR EACH ROW EXECUTE FUNCTION append_rls_organization_id_by_order_id() |
| append_rls_organization_id_on_wallet_insert ON wallets | trigger | public |  |  | CREATE TRIGGER append_rls_organization_id_on_wallet_insert BEFORE INSERT ON wallets FOR EACH ROW EXECUTE FUNCTION append_rls_organization_id_by_customer_id_or_agent_id_or_connec() |
| autopilot_executions_id_seq | sequence | public |  |  | not owned by serial/identity column |
| device_logs_id_seq | sequence | public |  |  | not owned by serial/identity column |
| device_types_id_seq | sequence | public |  |  | not owned by serial/identity column |
| devices_id_seq | sequence | public |  |  | not owned by serial/identity column |
| lorawan_directives_id_seq | sequence | public |  |  | not owned by serial/identity column |
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
| grafana_readonly | role | (cluster) |  |  | company-specific; grants in migration chain |
| make_readonly | role | (cluster) |  |  | company-specific; grants in migration chain |
| snaplet_readonly_2 | role | (cluster) |  |  | company-specific; grants in migration chain |
| hypopg | extension | extensions |  |  | v1.4.1 |
| index_advisor | extension | extensions |  |  | v0.2.0 |
| pg_graphql | extension | graphql |  |  | v1.5.9 |
| pg_net | extension | extensions |  |  | v0.14.0 |
| pg_stat_statements | extension | extensions |  |  | v1.10 |
| pgcrypto | extension | extensions |  |  | v1.3 |
| pgjwt | extension | extensions |  |  | v0.2.0 |
| pgsodium | extension | pgsodium |  |  | v3.1.8 |
| postgis | extension | extensions |  |  | v3.3.7 |
| supabase_vault | extension | vault |  |  | v0.2.8 |
| uuid-ossp | extension | extensions |  |  | v1.1 |
| (none) | storage bucket | storage |  |  | no buckets created by migration chain |
| on_auth_user_created ON auth.users | trigger | auth |  |  | migration-owned; on Supabase-managed table — CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user() |
| on_auth_user_updated ON auth.users | trigger | auth |  |  | migration-owned; on Supabase-managed table — CREATE TRIGGER on_auth_user_updated AFTER UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_update_user() |
