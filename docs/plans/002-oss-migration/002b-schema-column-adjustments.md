# Schema Column Adjustments (working review)

**Companion to:** `002b-database-baseline.md` — **Task 3b**
**Status:** Complete (2026-07-09) — G1–G4 signed off; register §1–§10 synced.
**Generated:** 2026-07-09 — full migration chain (CREATE + ALTER); repaired after G2 sign-off.

## Summary

| action | count |
|--------|------:|
| keep | 535 |
| drop | 49 |
| rename | 3 |

Pre-filled from deviation register **Column adjustments** §1–§10. Table/column names use **legacy**
names where register entries do (renames applied in Task 5 init migration).

## Register

| table | column | action | register § | rationale | notes |
|-------|--------|--------|------------|-----------|-------|
| accounts | id | keep |  |  | type: integer NOT NULL |
| accounts | created_at | keep |  |  | type: timestamp(3) with time |
| accounts | full_name | keep |  |  | type: character varying |
| accounts | email | keep |  |  | type: character varying |
| accounts | phone | keep |  |  | type: character varying |
| accounts | telegram_id | keep |  |  | type: character varying |
| accounts | telegram_link_token | keep |  |  | type: character varying |
| accounts | deleted_at | keep |  |  | type: timestamp(3) without time |
| accounts | supabase_id | keep |  |  | type: "uuid" |
| accounts | organization_id | keep |  |  | type: integer |
| agents | id | keep |  |  | type: integer NOT NULL |
| agents | created_at | keep |  |  | type: timestamp(3) with time |
| agents | grid_id | keep |  |  | type: integer |
| agents | account_id | keep |  |  | type: integer |
| agents | rls_organization_id | keep |  |  | type: integer |
| api_keys | id | keep |  |  | type: integer NOT NULL |
| api_keys | created_at | keep |  |  | type: timestamp(3) with time |
| api_keys | is_locked | drop | §7 | G1 baseline prune — unused in OSS | type: boolean DEFAULT false |
| api_keys | key | keep |  |  | type: character varying |
| api_keys | account_id | keep |  |  | type: integer |
| audits | id | keep |  |  | type: integer NOT NULL |
| audits | created_at | keep |  |  | type: timestamp(3) with time |
| audits | message | keep |  |  | type: character varying NOT |
| audits | from_fs_command | keep |  |  | type: boolean DEFAULT false |
| audits | author_id | keep |  |  | type: integer |
| audits | grid_id | keep |  |  | type: integer |
| audits | organization_id | keep |  |  | type: integer |
| audits | meter_id | keep |  |  | type: integer |
| audits | agent_id | keep |  |  | type: integer |
| audits | customer_id | keep |  |  | type: integer |
| audits | member_id | keep |  |  | type: integer |
| audits | connection_id | keep |  |  | type: integer |
| audits | dcu_id | keep |  |  | type: integer |
| banks | id | keep |  |  | type: integer NOT NULL |
| banks | created_at | keep |  |  | type: timestamp(3) with time |
| banks | name | keep |  |  | type: character varying NOT |
| banks | external_id | keep |  |  | type: character varying NOT |
| connection_requested_meters | id | keep |  |  | type: integer NOT NULL |
| connection_requested_meters | created_at | keep |  |  | type: timestamp(3) with time |
| connection_requested_meters | meter_type | keep |  |  | type: "public"."meter_type_enum" NOT NULL |
| connection_requested_meters | meter_phase | keep |  |  | type: "public"."meter_phase_enum" NOT NULL |
| connection_requested_meters | fee | keep |  |  | type: double precision DEFAULT |
| connection_requested_meters | deleted_at | keep |  |  | type: timestamp(3) without time |
| connection_requested_meters | connection_id | keep |  |  | type: integer NOT NULL |
| connection_requested_meters | rls_organization_id | keep |  |  | type: integer |
| connections | id | keep |  |  | type: integer NOT NULL |
| connections | created_at | keep |  |  | type: timestamp(3) with time |
| connections | deleted_at | keep |  |  | type: timestamp(3) without time |
| connections | document_type | keep |  |  | type: "public"."id_document_type_enum" DEFAULT 'PASSPORT'::"public"."id_document_type_enum" |
| connections | document_id | keep |  |  | type: character varying |
| connections | upload_uuid | keep |  |  | type: character varying |
| connections | external_system | keep |  |  | type: "public"."external_system_enum" DEFAULT 'EPICOLLECT'::"public"."external_system_enum" |
| connections | paid | keep |  |  | type: double precision DEFAULT |
| connections | currency | keep |  |  | type: "public"."currency_enum" NOT NULL |
| connections | women_impacted | keep |  |  | type: integer NOT NULL |
| connections | is_lifeline | keep |  |  | type: boolean |
| connections | is_public | keep |  |  | type: boolean NOT NULL |
| connections | is_commercial | keep |  |  | type: boolean NOT NULL |
| connections | is_residential | keep |  |  | type: boolean NOT NULL |
| connections | is_building_wired | keep |  |  | type: boolean DEFAULT false |
| connections | is_using_led_bulbs | keep |  |  | type: boolean DEFAULT false |
| connections | customer_id | keep |  |  | type: integer |
| connections | rls_organization_id | keep |  |  | type: integer |
| customers | id | keep |  |  | type: integer NOT NULL |
| customers | created_at | keep |  |  | type: timestamp(3) with time |
| customers | gender | keep |  |  | type: "public"."gender_enum" |
| customers | total_connection_fee | keep |  |  | type: double precision DEFAULT |
| customers | total_connection_paid | keep |  |  | type: double precision DEFAULT |
| customers | is_hidden_from_reporting | keep |  |  | type: boolean DEFAULT false |
| customers | lives_primarily_in_the_community | keep |  |  | type: boolean DEFAULT true |
| customers | latitude | keep |  |  | type: double precision |
| customers | longitude | keep |  |  | type: double precision |
| customers | generator_owned | keep |  |  | type: "public"."generator_type_enum" |
| customers | grid_id | keep |  |  | type: integer |
| customers | account_id | keep |  |  | type: integer |
| customers | rls_organization_id | keep |  |  | type: integer |
| dcus | id | keep |  |  | type: integer NOT NULL |
| dcus | created_at | keep |  |  | type: timestamp(3) with time |
| dcus | external_reference | keep |  |  | type: character varying NOT |
| dcus | queue_buffer_length | drop | §7 | G1 baseline prune — unused in OSS | type: integer DEFAULT 50 |
| dcus | external_system | keep |  |  | type: "public"."external_system_enum" NOT NULL |
| dcus | is_online | keep |  |  | type: boolean DEFAULT false |
| dcus | last_online_at | keep |  |  | type: timestamp(3) with time |
| dcus | is_online_updated_at | keep |  |  | type: timestamp(3) with time |
| dcus | communication_protocol | keep |  |  | type: "public"."communication_protocol_enum" |
| dcus | grid_id | keep |  |  | type: integer |
| dcus | last_metering_hardware_install_session_id | keep |  |  | type: integer |
| dcus | rls_organization_id | keep |  |  | type: integer |
| dcus | location_geom | keep |  |  | type: "extensions"."geometry"(Point,4326) |
| directive_batch_executions | id | keep |  |  | type: integer NOT NULL |
| directive_batch_executions | created_at | keep |  |  | type: timestamp(3) with time |
| directive_batch_executions | pending_count | keep |  |  | type: integer DEFAULT 0 |
| directive_batch_executions | processing_count | keep |  |  | type: integer DEFAULT 0 |
| directive_batch_executions | successful_count | keep |  |  | type: integer DEFAULT 0 |
| directive_batch_executions | failed_count | keep |  |  | type: integer DEFAULT 0 |
| directive_batch_executions | processed_count | keep |  |  | type: integer DEFAULT 0 |
| directive_batch_executions | total_count | keep |  |  | type: integer DEFAULT 0 |
| directive_batch_executions | directive_batch_id | rename | §6 | Align with renamed parent table | → meter_command_batch_id |
| directive_batch_executions | rls_organization_id | keep |  |  | type: integer |
| directive_batch_executions | completed_at | keep |  |  | type: (added) |
| directive_batch_executions | qualified_at | keep |  |  | type: (added) |
| directive_batches | id | keep |  |  | type: integer NOT NULL |
| directive_batches | created_at | keep |  |  | type: timestamp(3) with time |
| directive_batches | is_deleted | keep |  |  | type: boolean DEFAULT false |
| directive_batches | hour | keep |  |  | type: integer NOT NULL |
| directive_batches | minute | keep |  |  | type: integer NOT NULL |
| directive_batches | is_repeating | keep |  |  | type: boolean DEFAULT false |
| directive_batches | grid_id | keep |  |  | type: integer |
| directive_batches | directive_type | drop | §1 | Legacy; live code uses task_type + fs_command | type: "public"."directive_type_enum" |
| directive_batches | fs_command | keep |  |  | type: "public"."fs_command_type_enum" |
| directive_batches | lock_session | drop | §8 | G2 baseline prune — unused in OSS | G2 signed off |
| directive_batches | execution_bucket | drop | §8 | G2 baseline prune — unused in OSS | G2 signed off |
| directive_batches | author_id | keep |  |  | type: integer |
| directive_batches | updated_at | keep |  |  | type: timestamp(3) with time |
| directive_batches | rls_organization_id | keep |  |  | type: integer |
| directive_batches | task_type | keep |  |  | type: (added) |
| energy_cabins | id | keep |  |  | type: integer NOT NULL |
| energy_cabins | created_at | keep |  |  | type: timestamp(3) with time |
| energy_cabins | grid_id | keep |  |  | type: integer NOT NULL |
| energy_cabins | location_geom | keep |  |  | type: "extensions"."geometry"(Point,4326) NOT NULL |
| energy_cabins | rls_organization_id | keep |  |  | type: integer |
| grids | id | keep |  |  | type: integer NOT NULL |
| grids | created_at | keep |  |  | type: timestamp(3) with time |
| grids | deleted_at | keep |  |  | type: timestamp with time |
| grids | deployed_at | keep |  |  | type: timestamp(3) with time |
| grids | commissioned_at | keep |  |  | type: timestamp(3) with time |
| grids | name | keep |  |  | type: character varying NOT |
| grids | is_hps_on | keep |  |  | type: boolean DEFAULT false |
| grids | is_hps_on_updated_at | keep |  |  | type: timestamp(3) with time |
| grids | walkthrough_external_id | keep |  |  | type: character varying |
| grids | timezone | keep |  |  | type: character varying DEFAULT |
| grids | kwp | keep |  |  | type: double precision DEFAULT |
| grids | kwh | keep |  |  | type: double precision DEFAULT |
| grids | kwp_tariff | keep |  |  | type: double precision DEFAULT |
| grids | kwh_tariff | keep |  |  | type: double precision DEFAULT |
| grids | kwh_tariff_essential_service | keep |  |  | type: double precision DEFAULT |
| grids | kwh_tariff_full_service | keep |  |  | type: double precision DEFAULT |
| grids | current_weather | keep |  |  | type: "public"."weather_type_enum" |
| grids | generation_external_system | keep |  |  | type: "public"."external_system_enum" DEFAULT 'VICTRON'::"public"."external_system_enum" |
| grids | metering_external_system | keep |  |  | type: "public"."external_system_enum" DEFAULT 'CALIN'::"public"."external_system_enum" |
| grids | generation_external_site_id | keep |  |  | type: character varying |
| grids | generation_external_gateway_id | keep |  |  | type: character varying |
| grids | generation_gateway_last_seen_at | keep |  |  | type: timestamp(3) with time |
| grids | is_fs_on | keep |  |  | type: boolean DEFAULT false |
| grids | is_fs_on_updated_at | keep |  |  | type: timestamp(3) with time |
| grids | should_fs_be_on | keep |  |  | type: boolean DEFAULT false |
| grids | should_fs_be_on_updated_at | keep |  |  | type: timestamp(3) with time |
| grids | default_hps_connection_fee | keep |  |  | type: double precision DEFAULT |
| grids | default_fs_1_phase_connection_fee | keep |  |  | type: double precision DEFAULT |
| grids | default_fs_3_phase_connection_fee | keep |  |  | type: double precision DEFAULT |
| grids | monthly_rental | keep |  |  | type: double precision DEFAULT |
| grids | are_all_dcus_online | drop | §7 | G1 baseline prune — unused in OSS | type: boolean DEFAULT false |
| grids | are_all_dcus_under_high_load_threshold | drop | §7 | G1 baseline prune — unused in OSS | type: boolean DEFAULT true |
| grids | is_hidden_from_reporting | keep |  |  | type: boolean DEFAULT true |
| grids | is_three_phase_supported | keep |  |  | type: boolean DEFAULT false |
| grids | is_using_vsat | keep |  |  | type: boolean DEFAULT false |
| grids | is_using_mobile_network | keep |  |  | type: boolean DEFAULT false |
| grids | is_hps_on_threshold_kw | keep |  |  | type: double precision |
| grids | kwh_per_battery_module | keep |  |  | type: double precision |
| grids | identifier | keep |  |  | type: integer |
| grids | lifeline_connection_kwh_threshold | keep |  |  | type: integer DEFAULT 5 |
| grids | lifeline_connection_days_threshold | keep |  |  | type: integer DEFAULT 30 |
| grids | meter_consumption_issue_threshold_detection_days | drop | §7 | G1 baseline prune — unused in OSS | type: integer DEFAULT 30 |
| grids | meter_communication_issue_threshold_detection_days | drop | §7 | G1 baseline prune — unused in OSS | type: integer DEFAULT 7 |
| grids | uses_dual_meter_setup | drop | §7 | G1 baseline prune — unused in OSS | type: boolean DEFAULT false |
| grids | is_panel_cleaning_notification_enabled | keep |  |  | type: boolean DEFAULT false |
| grids | is_energised_notification_enabled | keep |  |  | type: boolean DEFAULT false |
| grids | is_fs_on_notification_enabled | keep |  |  | type: boolean DEFAULT false |
| grids | is_metering_hardware_online_notification_enabled | keep |  |  | type: boolean DEFAULT false |
| grids | is_tariff_change_notification_enabled | keep |  |  | type: boolean DEFAULT false |
| grids | is_upcoming_fs_control_rule_notification_enabled | keep |  |  | type: boolean DEFAULT false |
| grids | is_fs_control_rule_change_notification_enabled | keep |  |  | type: boolean DEFAULT false |
| grids | is_automatic_meter_install_enabled | keep |  |  | type: boolean DEFAULT false |
| grids | is_automatic_payout_generation_enabled | drop | §3 | Payouts module dropped (register #13) | type: boolean DEFAULT false |
| grids | is_automatic_energy_generation_data_sync_enabled | keep |  |  | type: boolean DEFAULT false |
| grids | is_automatic_meter_energy_consumption_data_sync_enabled | keep |  |  | type: boolean DEFAULT false |
| grids | is_dcu_connectivity_tracking_enabled | keep |  |  | type: boolean DEFAULT false |
| grids | is_router_connectivity_tracking_enabled | keep |  |  | type: boolean DEFAULT false |
| grids | is_cabin_meter_credit_depleting | keep |  |  | type: boolean DEFAULT false |
| grids | telegram_response_path_token | keep |  |  | type: character varying |
| grids | telegram_notification_channel_invite_link | keep |  |  | type: character varying |
| grids | telegram_response_path_autopilot | drop | §15 | Autopilot deferred (register #15) | type: character varying |
| grids | internal_telegram_group_chat_id | keep |  |  | type: character varying |
| grids | internal_telegram_group_thread_id | keep |  |  | type: character varying |
| grids | organization_id | keep |  |  | type: integer NOT NULL |
| grids | meter_commissioning_initial_credit_kwh | keep |  |  | type: real DEFAULT '0'::real |
| grids | is_generation_managed_by_nxt_grid | keep |  |  | type: boolean DEFAULT true |
| grids | location_geom | keep |  |  | type: "extensions"."geometry"(Point,4326) |
| grids | telegram_config | keep |  |  | type: "jsonb" DEFAULT '{}'::"jsonb" |
| grids | feature_access_config | keep |  |  | type: "jsonb" DEFAULT '{}'::"jsonb" |
| issues | id | keep |  |  | type: integer NOT NULL |
| issues | created_at | keep |  |  | type: timestamp(3) with time |
| issues | issue_type | keep |  |  | type: "public"."issue_type_enum" NOT NULL |
| issues | issue_status | keep |  |  | type: "public"."issue_status_enum" DEFAULT 'OPEN'::"public"."issue_status_enum" |
| issues | external_system | rename | §10 | Clarify external ticket tracking vs integration system | → external_tracking_system; G4 signed off |
| issues | snoozed_until | drop | §10 | G4 baseline prune — unused in OSS | type: timestamp with time zone; G4 signed off |
| issues | started_at | keep |  |  | type: timestamp(3) with time zone |
| issues | closed_at | keep |  |  | type: timestamp(3) with time zone |
| issues | estimated_lost_revenue | drop | §10 | G4 baseline prune — lost-revenue job inactive | type: double precision DEFAULT; G4 signed off |
| issues | external_reference | rename | §10 | Pair with external_tracking_system rename | → external_tracking_reference; G4 signed off |
| issues | meter_id | keep |  |  | type: integer |
| issues | mppt_id | drop | §10 | G4 baseline prune — unused in OSS | type: integer; G4 signed off |
| issues | grid_id | drop | §10 | G4 baseline prune — grid derivable from meter | type: integer; G4 signed off |
| issues | rls_organization_id | keep |  |  | type: integer |
| members | id | keep |  |  | type: integer NOT NULL |
| members | created_at | keep |  |  | type: timestamp(3) with time |
| members | subscribed_to_telegram_revenue_notifications | keep |  |  | type: boolean DEFAULT false |
| members | member_type | keep |  |  | type: "public"."member_type_enum" DEFAULT 'DEVELOPER'::"public"."member_type_enum" |
| members | account_id | keep |  |  | type: integer |
| members | busy_commissioning_id | keep |  |  | type: integer |
| members | training_level | keep |  |  | type: smallint DEFAULT '0'::smallint |
| members | rls_organization_id | keep |  |  | type: integer |
| members | hidden | keep |  |  | type: boolean DEFAULT false |
| meter_commissionings | id | keep |  |  | type: integer NOT NULL |
| meter_commissionings | created_at | keep |  |  | type: timestamp(3) with time |
| meter_commissionings | meter_commissioning_status | keep |  |  | type: "public"."meter_commissioning_status_enum" DEFAULT 'PROCESSING'::"public"."meter_commissioning_status_enum" |
| meter_commissionings | initialised_steps | drop | §8 | G2 baseline prune — step counters unused | G2 signed off |
| meter_commissionings | pending_steps | drop | §8 | G2 baseline prune — step counters unused | G2 signed off |
| meter_commissionings | processing_steps | drop | §8 | G2 baseline prune — step counters unused | G2 signed off |
| meter_commissionings | successful_steps | drop | §8 | G2 baseline prune — step counters unused | G2 signed off |
| meter_commissionings | failed_steps | drop | §8 | G2 baseline prune — step counters unused | G2 signed off |
| meter_commissionings | total_steps | drop | §8 | G2 baseline prune — step counters unused | G2 signed off |
| meter_commissionings | lock_session | drop | §8 | G2 baseline prune — unused in OSS | G2 signed off |
| meter_commissionings | metering_hardware_install_session_id | keep |  |  | type: integer |
| meter_commissionings | rls_organization_id | keep |  |  | type: integer |
| meter_interactions | id | keep |  |  | type: bigint NOT NULL |
| meter_interactions | created_at | keep |  |  | type: timestamp with time |
| meter_interactions | updated_at | keep |  |  | type: timestamp with time |
| meter_interactions | meter_id | keep |  |  | type: integer NOT NULL |
| meter_interactions | token | keep |  |  | type: "text" |
| meter_interactions | order_id | keep |  |  | type: integer |
| meter_interactions | transactive_kwh | keep |  |  | type: real |
| meter_interactions | target_power_limit | keep |  |  | type: integer |
| meter_interactions | result_value | keep |  |  | type: "jsonb" |
| meter_interactions | meter_interaction_type | keep |  |  | type: "public"."meter_interaction_type_enum" NOT NULL |
| meter_interactions | meter_interaction_status | keep |  |  | type: "public"."meter_interaction_status_enum" DEFAULT 'QUEUED'::"public"."meter_interaction_status_enum" |
| meter_interactions | batch_execution_id | keep |  |  | type: (added) |
| meter_interactions | meter_commissioning_id | keep |  |  | type: (added) |
| meter_interactions | delivery_failure_history | keep |  |  | type: (added) |
| meter_interactions | payload_data | keep |  |  | type: (added) |
| metering_hardware_imports | id | keep |  |  | type: integer NOT NULL |
| metering_hardware_imports | created_at | keep |  |  | type: timestamp(3) with time |
| metering_hardware_imports | metering_hardware_import_operation | keep |  |  | type: "public"."mhi_operation_enum" DEFAULT 'ADD'::"public"."mhi_operation_enum" |
| metering_hardware_imports | metering_hardware_import_status | keep |  |  | type: "public"."mhi_status_enum" DEFAULT 'PENDING'::"public"."mhi_status_enum" |
| metering_hardware_imports | metering_hardware_install_session_id | keep |  |  | type: integer |
| metering_hardware_imports | lock_session | keep |  |  | type: character varying |
| metering_hardware_imports | rls_organization_id | keep |  |  | type: integer |
| metering_hardware_install_sessions | id | keep |  |  | type: integer NOT NULL |
| metering_hardware_install_sessions | created_at | keep |  |  | type: timestamp(3) with time |
| metering_hardware_install_sessions | dcu_id | keep |  |  | type: integer |
| metering_hardware_install_sessions | meter_id | keep |  |  | type: integer |
| metering_hardware_install_sessions | author_id | keep |  |  | type: integer |
| metering_hardware_install_sessions | last_meter_commissioning_id | keep |  |  | type: integer |
| metering_hardware_install_sessions | last_metering_hardware_import_id | keep |  |  | type: integer |
| metering_hardware_install_sessions | rls_organization_id | keep |  |  | type: integer |
| meters | id | keep |  |  | type: integer NOT NULL |
| meters | created_at | keep |  |  | type: timestamp(3) with time |
| meters | external_reference | keep |  |  | type: character varying NOT |
| meters | deleted_at | keep |  |  | type: timestamp(3) without time |
| meters | balance | keep |  |  | type: double precision |
| meters | balance_updated_at | keep |  |  | type: timestamp(3) with time |
| meters | kwh_credit_available | keep |  |  | type: double precision |
| meters | kwh_credit_available_updated_at | keep |  |  | type: timestamp(3) with time |
| meters | last_non_zero_consumption_at | keep |  |  | type: timestamp(3) with time |
| meters | is_on | keep |  |  | type: boolean DEFAULT false |
| meters | should_be_on | keep |  |  | type: boolean DEFAULT false |
| meters | is_on_updated_at | keep |  |  | type: timestamp(3) with time |
| meters | should_be_on_updated_at | keep |  |  | type: timestamp(3) with time |
| meters | is_manual_mode_on | keep |  |  | type: boolean DEFAULT false |
| meters | is_manual_mode_on_updated_at | keep |  |  | type: timestamp(3) with time |
| meters | voltage | keep |  |  | type: double precision |
| meters | voltage_updated_at | keep |  |  | type: timestamp(3) with time |
| meters | power | keep |  |  | type: double precision |
| meters | power_updated_at | keep |  |  | type: timestamp(3) with time |
| meters | latitude | keep |  |  | type: double precision |
| meters | longitude | keep |  |  | type: double precision |
| meters | coord_accuracy | keep |  |  | type: double precision DEFAULT |
| meters | power_limit | keep |  |  | type: integer |
| meters | power_limit_updated_at | keep |  |  | type: timestamp(3) with time |
| meters | power_limit_should_be | keep |  |  | type: integer |
| meters | power_down_count | drop | §8 | G2 baseline prune — unused in OSS | G2 signed off |
| meters | power_down_count_updated_at | drop | §8 | G2 baseline prune — unused in OSS | G2 signed off |
| meters | power_limit_should_be_updated_at | keep |  |  | type: timestamp(3) with time |
| meters | is_starred | keep |  |  | type: boolean DEFAULT false |
| meters | external_system | keep |  |  | type: "public"."external_system_enum" NOT NULL |
| meters | meter_type | keep |  |  | type: "public"."meter_type_enum" DEFAULT 'HPS'::"public"."meter_type_enum" |
| meters | nickname | keep |  |  | type: character varying |
| meters | last_seen_at | keep |  |  | type: timestamp(3) with time |
| meters | issue_check_execution_session | keep |  |  | type: character varying |
| meters | issue_check_last_run_at | keep |  |  | type: timestamp(3) with time |
| meters | pole_id | keep |  |  | type: integer |
| meters | meter_phase | keep |  |  | type: "public"."meter_phase_enum" DEFAULT 'SINGLE_PHASE'::"public"."meter_phase_enum" |
| meters | last_metering_hardware_install_session_id | keep |  |  | type: integer |
| meters | kwh_tariff | keep |  |  | type: double precision |
| meters | watchdog_session | drop | §4b | Watchdog module dropped (register #4); no app usage | type: character varying |
| meters | watchdog_last_run_at | drop | §4b | Watchdog module dropped (register #4); no app usage | type: timestamp(3) with time |
| meters | version | keep |  |  | type: character varying |
| meters | is_simulated | drop | §8 | G2 baseline prune — unused in OSS | G2 signed off |
| meters | power_limit_hps_mode | keep |  |  | type: integer DEFAULT 200 |
| meters | current_special_status | drop | §1 | Shadow of deprecated directive status; issues table is canonical | type: "public"."directive_special_status_enum" |
| meters | communication_protocol | keep |  |  | type: "public"."communication_protocol_enum" DEFAULT 'CALIN_LORAWAN'::public.communication_protocol_enum |
| meters | is_cabin_meter | keep |  |  | type: boolean DEFAULT false |
| meters | last_encountered_issue_id | keep |  |  | type: integer |
| meters | connection_id | keep |  |  | type: integer |
| meters | dcu_id | keep |  |  | type: integer |
| meters | decoder_key | keep |  |  | type: "text" |
| meters | last_sts_token_issued_at | keep |  |  | type: timestamp with time |
| meters | rls_grid_id | keep |  |  | type: integer |
| meters | rls_organization_id | keep |  |  | type: integer |
| meters | is_test_mode_on | keep |  |  | type: boolean DEFAULT false |
| meters | pulse_counter_kwh | drop | §8 | G2 baseline prune — unused in OSS | G2 signed off |
| meters | device_id | drop | §4 | Only referenced dropped devices table | type: bigint |
| meters | pulse_counter_kwh_updated_at | drop | §8 | G2 baseline prune — unused in OSS | G2 signed off |
| meters | connection_metrics | keep |  |  | type: "jsonb" |
| mppts | id | keep |  |  | type: integer NOT NULL |
| mppts | created_at | keep |  |  | type: timestamp(3) with time |
| mppts | external_reference | keep |  |  | type: character varying NOT |
| mppts | external_id | keep |  |  | type: character varying NOT |
| mppts | external_system | keep |  |  | type: "public"."external_system_enum" DEFAULT 'VICTRON'::"public"."external_system_enum" |
| mppts | kw | keep |  |  | type: double precision |
| mppts | azimuth | keep |  |  | type: double precision |
| mppts | tilt | keep |  |  | type: double precision |
| mppts | installed_at | keep |  |  | type: timestamp(3) with time |
| mppts | deleted_at | keep |  |  | type: timestamp(3) with time |
| mppts | mppt_type | keep |  |  | type: "public"."mppt_type_enum" DEFAULT 'MPPT'::"public"."mppt_type_enum" |
| mppts | grid_id | keep |  |  | type: integer |
| mppts | rls_organization_id | keep |  |  | type: integer |
| notes | id | keep |  |  | type: integer NOT NULL |
| notes | created_at | keep |  |  | type: timestamp(3) with time |
| notes | message | keep |  |  | type: character varying |
| notes | customer_id | keep |  |  | type: integer |
| notes | connection_id | keep |  |  | type: integer |
| notes | meter_id | keep |  |  | type: integer |
| notes | author_id | keep |  |  | type: integer |
| notes | rls_organization_id | keep |  |  | type: integer |
| notification_parameters | id | keep |  |  | type: integer NOT NULL |
| notification_parameters | created_at | keep |  |  | type: timestamp(3) with time |
| notification_parameters | parameters | keep |  |  | type: "json" |
| notifications | id | keep |  |  | type: integer NOT NULL |
| notifications | created_at | keep |  |  | type: timestamp(3) with time |
| notifications | connector_external_system | keep |  |  | type: "public"."external_system_enum" |
| notifications | carrier_external_system | keep |  |  | type: "public"."external_system_enum" |
| notifications | notification_type | keep |  |  | type: "public"."notification_type_enum" NOT NULL |
| notifications | notification_status | keep |  |  | type: "public"."notification_status_enum" NOT NULL |
| notifications | external_reference | keep |  |  | type: character varying |
| notifications | notification_parameter_id | keep |  |  | type: integer |
| notifications | grid_id | keep |  |  | type: integer |
| notifications | organization_id | keep |  |  | type: integer |
| notifications | account_id | keep |  |  | type: integer |
| notifications | lock_session | keep |  |  | type: character varying |
| notifications | message | keep |  |  | type: character varying |
| notifications | phone | keep |  |  | type: character varying |
| notifications | subject | keep |  |  | type: character varying |
| notifications | email | keep |  |  | type: character varying |
| notifications | chat_id | keep |  |  | type: character varying |
| notifications | thread_id | keep |  |  | type: character varying |
| orders | id | keep |  |  | type: integer NOT NULL |
| orders | created_at | keep |  |  | type: timestamp(3) with time |
| orders | amount | keep |  |  | type: double precision NOT |
| orders | order_status | keep |  |  | type: "public"."order_status_enum" DEFAULT 'PENDING'::"public"."order_status_enum" |
| orders | lock_session | keep |  |  | type: character varying |
| orders | external_reference | keep |  |  | type: character varying |
| orders | currency | keep |  |  | type: "public"."currency_enum" NOT NULL |
| orders | external_system | drop | §9 | G3 baseline prune — unused in OSS | type: "public"."external_system_enum"; G3 signed off |
| orders | tariff_type | keep |  |  | type: "public"."meter_type_enum" |
| orders | tariff | keep |  |  | type: double precision DEFAULT |
| orders | payment_method | keep |  |  | type: "public"."payment_method_enum" |
| orders | payment_channel | keep |  |  | type: "public"."payment_channel_enum" |
| orders | author_id | keep |  |  | type: integer |
| orders | directive_id | drop | §1 | Only referenced excluded directive tables | type: bigint |
| orders | meter_credit_transfer_id | drop | §2 | Only referenced excluded meter_credit_transfers | type: integer |
| orders | historical_grid_id | keep |  |  | type: integer |
| orders | meta_author_type | keep |  |  | type: "public"."account_type_enum" |
| orders | meta_author_name | keep |  |  | type: character varying |
| orders | meta_author_id | keep |  |  | type: integer |
| orders | meta_order_type | keep |  |  | type: "public"."order_type_enum" |
| orders | meta_sender_id | keep |  |  | type: integer |
| orders | meta_sender_name | keep |  |  | type: character varying |
| orders | meta_receiver_name | keep |  |  | type: character varying |
| orders | meta_receiver_name_part_2 | keep |  |  | type: character varying |
| orders | meta_sender_name_part_2 | keep |  |  | type: character varying |
| orders | meta_receiver_id | keep |  |  | type: integer |
| orders | meta_sender_type | keep |  |  | type: "public"."order_actor_type_enum" |
| orders | meta_receiver_type | keep |  |  | type: "public"."order_actor_type_enum" |
| orders | meta_is_hidden_from_reporting | keep |  |  | type: boolean |
| orders | sender_wallet_id | keep |  |  | type: integer |
| orders | receiver_wallet_id | keep |  |  | type: integer |
| orders | ussd_session_id | keep |  |  | type: integer |
| orders | lorawan_directive_id | drop | §1 | Only referenced excluded directive tables | type: bigint |
| orders | meta_receiver_id_part_2 | keep |  |  | type: integer |
| orders | rls_organization_id | keep |  |  | type: integer |
| orders | updated_at | keep |  |  | type: timestamp with time |
| organizations | id | keep |  |  | type: integer NOT NULL |
| organizations | created_at | keep |  |  | type: timestamp(3) with time |
| organizations | name | keep |  |  | type: character varying NOT |
| organizations | formal_name | keep |  |  | type: character varying |
| organizations | email | keep |  |  | type: character varying |
| organizations | phone | drop | §7 | G1 baseline prune — unused in OSS | type: character varying |
| organizations | address | drop | §7 | G1 baseline prune — unused in OSS | type: character varying |
| organizations | epicollect_contract_survey_slug | keep |  |  | type: character varying |
| organizations | epicollect_contract_survey_secret | keep |  |  | type: character varying |
| organizations | epicollect_contract_survey_client_id | keep |  |  | type: character varying |
| organizations | epicollect_contract_last_sync_at | keep |  |  | type: timestamp(3) with time |
| organizations | developer_group_telegram_chat_id | keep |  |  | type: character varying |
| organizations | deleted_at | keep |  |  | type: timestamp with time |
| organizations | pd_hero_google_drive_folder_id | drop | §5 | pd-hero workflow dropped (register #14) | type: "text" |
| organizations | organization_type | keep |  |  | type: "public"."organization_type_enum" DEFAULT 'SOLAR_DEVELOPER'::"public"."organization_type_enum" |
| pd_site_submissions | id | keep |  |  | type: bigint NOT NULL |
| pd_site_submissions | created_at | keep |  |  | type: timestamp with time |
| pd_site_submissions | author_full_name | keep |  |  | type: "text" NOT NULL |
| pd_site_submissions | author_email | keep |  |  | type: "text" NOT NULL |
| pd_site_submissions | author_organization_name | keep |  |  | type: "text" NOT NULL |
| pd_site_submissions | site_name | keep |  |  | type: character varying NOT |
| pd_site_submissions | site_details | keep |  |  | type: "jsonb" NOT NULL |
| pd_site_submissions | outline_geom | keep |  |  | type: "extensions"."geometry"(Polygon,4326) |
| pd_site_submissions | deleted_at | keep |  |  | type: timestamp with time |
| pd_site_submissions | location_geom | keep |  |  | type: "extensions"."geometry"(Point,4326) |
| pd_site_submissions | organization_id | keep |  |  | type: integer |
| pd_site_submissions | author_organization_id | keep |  |  | type: integer |
| pd_site_submissions | buildings_geo_flat | keep |  |  | type: "jsonb" |
| pd_site_submissions | distribution_geo_flat | keep |  |  | type: "jsonb" |
| pd_site_submissions | meta_geo_flat | keep |  |  | type: "jsonb" |
| pd_site_submissions | poles_geo_flat | keep |  |  | type: "jsonb" |
| pd_sites | id | keep |  |  | type: bigint NOT NULL |
| pd_sites | created_at | keep |  |  | type: timestamp with time |
| pd_sites | organization_id | keep |  |  | type: integer |
| pd_sites | name | keep |  |  | type: "text" NOT NULL |
| pd_sites | deleted_at | keep |  |  | type: timestamp with time |
| pd_sites | location_geom | keep |  |  | type: "extensions"."geometry"(Point,4326) |
| pd_sites | outline_geom | keep |  |  | type: "extensions"."geometry"(Polygon,4326) |
| pd_sites | pd_flow_id | drop | §5 | Only referenced dropped pd-hero workflow tables | type: bigint |
| pd_sites | operations_grid_id | keep |  |  | type: integer |
| poles | id | keep |  |  | type: integer NOT NULL |
| poles | created_at | keep |  |  | type: timestamp(3) with time |
| poles | external_reference | keep |  |  | type: character varying(10) NOT |
| poles | nickname | keep |  |  | type: character varying |
| poles | is_virtual | keep |  |  | type: boolean DEFAULT false |
| poles | location_accuracy | keep |  |  | type: double precision |
| poles | grid_id | keep |  |  | type: integer |
| poles | location_geom | keep |  |  | type: "extensions"."geometry"(Point,4326) NOT NULL |
| poles | rls_organization_id | keep |  |  | type: integer |
| routers | id | keep |  |  | type: integer NOT NULL |
| routers | created_at | keep |  |  | type: timestamp(3) with time |
| routers | external_reference | keep |  |  | type: character varying NOT |
| routers | external_system | keep |  |  | type: "public"."external_system_enum" DEFAULT 'ZEROTIER'::"public"."external_system_enum" |
| routers | is_online | keep |  |  | type: boolean DEFAULT false |
| routers | is_online_updated_at | keep |  |  | type: timestamp(3) with time |
| routers | deleted_at | keep |  |  | type: timestamp(3) with time |
| routers | grid_id | keep |  |  | type: integer |
| routers | rls_organization_id | keep |  |  | type: integer |
| solcast_cache | id | keep |  |  | type: integer NOT NULL |
| solcast_cache | created_at | keep |  |  | type: timestamp(3) with time |
| solcast_cache | request_type | keep |  |  | type: "public"."solcast_cache_request_type_enum" NOT NULL |
| solcast_cache | latitude | keep |  |  | type: numeric(8,6) NOT NULL |
| solcast_cache | longitude | keep |  |  | type: numeric(9,6) NOT NULL |
| solcast_cache | tilt | keep |  |  | type: numeric(10,3) NOT NULL |
| solcast_cache | azimuth | keep |  |  | type: numeric(10,3) NOT NULL |
| solcast_cache | capacity_kwp | keep |  |  | type: numeric(10,3) NOT NULL |
| solcast_cache | install_date | keep |  |  | type: character varying NOT |
| solcast_cache | response | keep |  |  | type: "text" NOT NULL |
| transactions | id | keep |  |  | type: bigint NOT NULL |
| transactions | created_at | keep |  |  | type: timestamp(3) with time |
| transactions | amount | keep |  |  | type: double precision NOT |
| transactions | transaction_status | keep |  |  | type: "public"."transaction_status_enum" NOT NULL |
| transactions | balance_before | keep |  |  | type: double precision DEFAULT |
| transactions | balance_after | keep |  |  | type: double precision DEFAULT |
| transactions | wallet_id | keep |  |  | type: integer |
| transactions | order_id | keep |  |  | type: integer |
| transactions | rls_organization_id | keep |  |  | type: integer |
| ussd_session_hops | id | keep |  |  | type: integer NOT NULL |
| ussd_session_hops | created_at | keep |  |  | type: timestamp(3) with time |
| ussd_session_hops | text | keep |  |  | type: character varying |
| ussd_session_hops | phone | keep |  |  | type: character varying |
| ussd_session_hops | network_code | keep |  |  | type: character varying |
| ussd_session_hops | service_code | keep |  |  | type: character varying |
| ussd_session_hops | ussd_session_id | keep |  |  | type: integer |
| ussd_sessions | id | keep |  |  | type: integer NOT NULL |
| ussd_sessions | created_at | keep |  |  | type: timestamp(3) with time |
| ussd_sessions | phone | keep |  |  | type: character varying NOT |
| ussd_sessions | amount | keep |  |  | type: double precision |
| ussd_sessions | external_reference | keep |  |  | type: character varying |
| ussd_sessions | external_system | keep |  |  | type: "public"."external_system_enum" NOT NULL |
| ussd_sessions | is_using_other_option | keep |  |  | type: boolean DEFAULT false |
| ussd_sessions | account_id | keep |  |  | type: integer |
| ussd_sessions | meter_id | keep |  |  | type: integer |
| ussd_sessions | bank_id | keep |  |  | type: integer |
| wallets | id | keep |  |  | type: integer NOT NULL |
| wallets | created_at | keep |  |  | type: timestamp(3) with time |
| wallets | organization_id | keep |  |  | type: integer |
| wallets | agent_id | keep |  |  | type: integer |
| wallets | customer_id | keep |  |  | type: integer |
| wallets | meter_id | keep |  |  | type: integer |
| wallets | lock_session | keep |  |  | type: character varying |
| wallets | balance | keep |  |  | type: double precision DEFAULT |
| wallets | balance_updated_at | keep |  |  | type: timestamp(3) with time |
| wallets | identifier | keep |  |  | type: character varying |
| wallets | wallet_type | keep |  |  | type: "public"."wallet_type_enum" DEFAULT 'REAL'::"public"."wallet_type_enum" |
| wallets | goldring_migration_id | drop | §9 | G3 baseline prune — Goldring migration-era ID | type: integer; G3 signed off |
| wallets | connection_id | keep |  |  | type: integer |
| wallets | rls_organization_id | keep |  |  | type: integer |
| agents_with_account | id | keep |  |  | view column |
| agents_with_account | created_at | keep |  |  | view column |
| agents_with_account | grid_id | keep |  |  | view column |
| agents_with_account | account_id | keep |  |  | view column |
| agents_with_account | full_name | keep |  |  | view column |
| agents_with_account | phone | keep |  |  | view column |
| agents_with_account | deleted_at | keep |  |  | view column |
| customers_with_account | id | keep |  |  | view column |
| customers_with_account | created_at | keep |  |  | view column |
| customers_with_account | gender | keep |  |  | view column |
| customers_with_account | total_connection_fee | keep |  |  | view column |
| customers_with_account | total_connection_paid | keep |  |  | view column |
| customers_with_account | is_hidden_from_reporting | keep |  |  | view column |
| customers_with_account | lives_primarily_in_the_community | keep |  |  | view column |
| customers_with_account | latitude | keep |  |  | view column |
| customers_with_account | longitude | keep |  |  | view column |
| customers_with_account | generator_owned | keep |  |  | view column |
| customers_with_account | grid_id | keep |  |  | view column |
| customers_with_account | account_id | keep |  |  | view column |
| customers_with_account | full_name | keep |  |  | view column |
| customers_with_account | phone | keep |  |  | view column |
| customers_with_account | deleted_at | keep |  |  | view column |
| customers_with_account | has_fully_paid_connection_fees | keep |  |  | view column |
| customers_with_account | meter | keep |  |  | view column — comma-separated meter external refs |
| meters_with_account_and_statuses | id | keep |  |  | view column |
| meters_with_account_and_statuses | created_at | keep |  |  | view column |
| meters_with_account_and_statuses | external_reference | keep |  |  | view column |
| meters_with_account_and_statuses | deleted_at | keep |  |  | view column |
| meters_with_account_and_statuses | balance | keep |  |  | view column |
| meters_with_account_and_statuses | balance_updated_at | keep |  |  | view column |
| meters_with_account_and_statuses | kwh_credit_available | keep |  |  | view column |
| meters_with_account_and_statuses | kwh_credit_available_updated_at | keep |  |  | view column |
| meters_with_account_and_statuses | last_non_zero_consumption_at | keep |  |  | view column |
| meters_with_account_and_statuses | is_on | keep |  |  | view column |
| meters_with_account_and_statuses | should_be_on | keep |  |  | view column |
| meters_with_account_and_statuses | is_on_updated_at | keep |  |  | view column |
| meters_with_account_and_statuses | should_be_on_updated_at | keep |  |  | view column |
| meters_with_account_and_statuses | is_manual_mode_on | keep |  |  | view column |
| meters_with_account_and_statuses | is_manual_mode_on_updated_at | keep |  |  | view column |
| meters_with_account_and_statuses | voltage | keep |  |  | view column |
| meters_with_account_and_statuses | voltage_updated_at | keep |  |  | view column |
| meters_with_account_and_statuses | power | keep |  |  | view column |
| meters_with_account_and_statuses | power_updated_at | keep |  |  | view column |
| meters_with_account_and_statuses | latitude | keep |  |  | view column |
| meters_with_account_and_statuses | longitude | keep |  |  | view column |
| meters_with_account_and_statuses | coord_accuracy | keep |  |  | view column |
| meters_with_account_and_statuses | power_limit | keep |  |  | view column |
| meters_with_account_and_statuses | power_limit_updated_at | keep |  |  | view column |
| meters_with_account_and_statuses | power_limit_should_be | keep |  |  | view column |
| meters_with_account_and_statuses | power_down_count | drop | §8 | Follows meters column drop | view column; G2 signed off |
| meters_with_account_and_statuses | power_down_count_updated_at | drop | §8 | Follows meters column drop | view column; G2 signed off |
| meters_with_account_and_statuses | power_limit_should_be_updated_at | keep |  |  | view column |
| meters_with_account_and_statuses | is_starred | keep |  |  | view column |
| meters_with_account_and_statuses | external_system | keep |  |  | view column |
| meters_with_account_and_statuses | meter_type | keep |  |  | view column |
| meters_with_account_and_statuses | nickname | keep |  |  | view column |
| meters_with_account_and_statuses | last_seen_at | keep |  |  | view column |
| meters_with_account_and_statuses | issue_check_execution_session | keep |  |  | view column |
| meters_with_account_and_statuses | issue_check_last_run_at | keep |  |  | view column |
| meters_with_account_and_statuses | pole_id | keep |  |  | view column |
| meters_with_account_and_statuses | meter_phase | keep |  |  | view column |
| meters_with_account_and_statuses | last_metering_hardware_install_session_id | keep |  |  | view column |
| meters_with_account_and_statuses | kwh_tariff | keep |  |  | view column |
| meters_with_account_and_statuses | watchdog_session | drop | §4b | Follows meters column drop | view column |
| meters_with_account_and_statuses | watchdog_last_run_at | drop | §4b | Follows meters column drop | view column |
| meters_with_account_and_statuses | version | keep |  |  | view column |
| meters_with_account_and_statuses | is_simulated | drop | §8 | Follows meters column drop | view column; G2 signed off |
| meters_with_account_and_statuses | power_limit_hps_mode | keep |  |  | view column |
| meters_with_account_and_statuses | current_special_status | drop | §1 | Follows meters column drop | view column |
| meters_with_account_and_statuses | communication_protocol | keep |  |  | view column |
| meters_with_account_and_statuses | is_cabin_meter | keep |  |  | view column |
| meters_with_account_and_statuses | last_encountered_issue_id | keep |  |  | view column |
| meters_with_account_and_statuses | connection_id | keep |  |  | view column |
| meters_with_account_and_statuses | dcu_id | keep |  |  | view column |
| meters_with_account_and_statuses | decoder_key | keep |  |  | view column |
| meters_with_account_and_statuses | last_sts_token_issued_at | keep |  |  | view column |
| meters_with_account_and_statuses | rls_grid_id | keep |  |  | view column |
| meters_with_account_and_statuses | rls_organization_id | keep |  |  | view column |
| meters_with_account_and_statuses | is_test_mode_on | keep |  |  | view column |
| meters_with_account_and_statuses | pulse_counter_kwh | drop | §8 | Follows meters column drop | view column; G2 signed off |
| meters_with_account_and_statuses | device_id | drop | §4 | Follows meters column drop | view column |
| meters_with_account_and_statuses | grid_id | keep |  |  | view column |
| meters_with_account_and_statuses | is_hidden_from_reporting | keep |  |  | view column |
| meters_with_account_and_statuses | full_name | keep |  |  | view column |
| meters_with_account_and_statuses | phone | keep |  |  | view column |
| meters_with_account_and_statuses | install_status | keep |  |  | view column |
| meters_with_account_and_statuses | open_issue | keep |  |  | view column |

**Actions:** `keep` | `drop` | `rename`

**Workflow:**

1. ~~Maintainer reviews in batches (G1 ✓, G2 ✓, G3 ✓, G4 notifications + field ops ✓).~~ **Task 3b complete.** Enum/function/trigger review → Task 3c.
2. Edit actions here; add rationale for new drops/renames.
3. On sign-off per batch: sync confirmed `drop`/`rename` rows to deviation register **Column adjustments**.
4. Task 3 complete when every row has final action and register is synced.

**Not in scope:** columns on excluded/dropped tables. Enum **value** trimming is a separate pass.
