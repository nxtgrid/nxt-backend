-- =============================================================================
-- OSS baseline init migration
-- =============================================================================
-- Canonical baseline schema for the NXT Grid mini-grid management platform,
-- derived from the legacy migration chain (legacy/supabase/migrations/) minus
-- dead/deprecated/company-specific objects. Every deviation from the legacy
-- chain is recorded in docs/plans/002-oss-migration/002b-schema-deviation-register.md
-- (register entries #1-#34 and the Column/Programmability/Performance/Data API/
-- FK adjustment sections) — that file is the authoritative source for "why" any
-- given line here differs from the legacy chain.
-- =============================================================================

-- =============================================================================
-- Extensions
-- =============================================================================
-- Only extensions NOT already enabled on a fresh Supabase Postgres image are
-- created here. Platform defaults (pg_stat_statements, pgcrypto,
-- supabase_vault, uuid-ossp), pg_graphql, and advisor tooling (hypopg,
-- index_advisor) are intentionally omitted — see register #11.
-- pgjwt is intentionally NOT enabled: unavailable on Postgres 17 and confirmed
-- unused in the legacy schema/app code (register #11, amended 2026-07-10).

CREATE EXTENSION IF NOT EXISTS "postgis" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pgsodium";

-- =============================================================================
-- Enum types
-- =============================================================================
-- 31 of the legacy chain's 42 enum types are kept. Dropped (register #1, #7,
-- #13, #14): directive_direction_enum, directive_error_enum,
-- directive_phase_enum, directive_special_status_enum, directive_status_enum,
-- directive_type_enum, meter_credit_transfer_status_enum, payout_status_enum,
-- pd_action_status_enum, pd_action_type_enum, pd_document_type_enum.
-- Value trims: external_system_enum drops JOTFORM/STEAMACO/ACREL (register
-- #28); notification_type_enum drops AUTO_PAYOUT_GENRATION_REPORT (register
-- #29). organization_type_enum gains PLATFORM_OPERATOR (register #22 — the
-- DB-native admin-organization flag; see rls_check_if_admin_org_member()).

CREATE TYPE public.account_type_enum AS ENUM (
    'AGENT',
    'MEMBER',
    'CUSTOMER'
);

CREATE TYPE public.communication_protocol_enum AS ENUM (
    'CALIN_V1',
    'CALIN_V2',
    'CALIN_LORAWAN'
);

CREATE TYPE public.currency_enum AS ENUM (
    'USD',
    'NGN',
    'EUR'
);

-- external_system_enum: JOTFORM, STEAMACO, ACREL dropped (register #28)
CREATE TYPE public.external_system_enum AS ENUM (
    'CALIN',
    'SOLCAST',
    'VICTRON',
    'FLUTTERWAVE',
    'AFRICASTALKING',
    'EPICOLLECT',
    'JIRA',
    'TELEGRAM',
    'ZEROTIER',
    'MAKE',
    'FLOW_XO',
    'SENDGRID'
);

CREATE TYPE public.fs_command_type_enum AS ENUM (
    'ON',
    'OFF'
);

CREATE TYPE public.gender_enum AS ENUM (
    'MALE',
    'FEMALE'
);

CREATE TYPE public.generator_type_enum AS ENUM (
    'SMALL',
    'LARGE'
);

CREATE TYPE public.id_document_type_enum AS ENUM (
    'PASSPORT',
    'NATIONAL_ID',
    'DRIVING_LICENSE',
    'VOTERS_CARD'
);

CREATE TYPE public.issue_status_enum AS ENUM (
    'OPEN',
    'CLOSED',
    'OVERRIDDEN'
);

CREATE TYPE public.issue_type_enum AS ENUM (
    'NO_COMMUNICATION',
    'METER_NOT_ACTIVATED',
    'TAMPER',
    'POWER_LIMIT_BREACHED',
    'OVER_VOLTAGE',
    'LOW_VOLTAGE',
    'POWER_LIMIT_BAD_CONFIGURATION',
    'METER_STATE_BAD_CONFIGURATION',
    'UNEXPECTED_POWER_LIMIT',
    'UNEXPECTED_METER_STATUS',
    'NO_CREDIT',
    'NO_CONSUMPTION',
    'NUMBER_OF_PHASES',
    'VEBUS_STATE',
    'VEBUS_ERROR',
    'QUATTRO_TEMPERATURE_ALARM',
    'QUATTRO_OVERLOAD_ALARM',
    'HIGH_BATTERY_TEMPERATURE_ALARM',
    'CELL_IMBALANCE_ALARM',
    'HIGH_CHARGE_CURRENT_ALARM',
    'HIGH_CHARGE_TEMPERATURE_ALARM',
    'BATTERY_INTERNAL_FAILURE',
    'BATTERY_CHARGE_BLOCKED_ALARM',
    'BATTERY_DISCHARGE_BLOCKED_ALARM'
);

CREATE TYPE public.member_type_enum AS ENUM (
    'SUPERADMIN',
    'ADMIN',
    'PARTNER',
    'FINANCE',
    'DEVELOPER',
    'MANAGER',
    'SUPPORT',
    'SERVICE',
    'SALES',
    'TECH'
);

CREATE TYPE public.meter_commissioning_status_enum AS ENUM (
    'PENDING',
    'PROCESSING',
    'SUCCESSFUL',
    'FAILED'
);

CREATE TYPE public.meter_interaction_status_enum AS ENUM (
    'QUEUED',
    'ABORTED',
    'PROCESSING',
    'SUCCESSFUL',
    'FAILED',
    'DEFERRED',
    'SUSPENDED'
);

CREATE TYPE public.meter_interaction_type_enum AS ENUM (
    'READ_CREDIT',
    'READ_POWER_LIMIT',
    'READ_VOLTAGE',
    'SET_POWER_LIMIT',
    'TOP_UP',
    'TURN_ON',
    'TURN_OFF',
    'READ_POWER',
    'READ_CURRENT',
    'CLEAR_CREDIT',
    'CLEAR_TAMPER',
    'READ_REPORT',
    'JOIN_NETWORK',
    'DELIVER_PREEXISTING_TOKEN',
    'READ_VERSION',
    'READ_DATE',
    'SET_DATE',
    'READ_TIME',
    'SET_TIME'
);

CREATE TYPE public.meter_phase_enum AS ENUM (
    'SINGLE_PHASE',
    'THREE_PHASE'
);

CREATE TYPE public.meter_type_enum AS ENUM (
    'HPS',
    'FS'
);

CREATE TYPE public.mhi_operation_enum AS ENUM (
    'ADD',
    'REMOVE'
);

CREATE TYPE public.mhi_status_enum AS ENUM (
    'PENDING',
    'PROCESSING',
    'SUCCESSFUL',
    'FAILED'
);

CREATE TYPE public.mppt_type_enum AS ENUM (
    'MPPT',
    'PV_INVERTER'
);

CREATE TYPE public.notification_status_enum AS ENUM (
    'PENDING',
    'PROCESSING',
    'RECEIVED_BY_API',
    'FAILED',
    'SUCCESSFUL',
    'READ',
    'UNKNOWN'
);

-- notification_type_enum: AUTO_PAYOUT_GENRATION_REPORT dropped (register #29)
CREATE TYPE public.notification_type_enum AS ENUM (
    'GRID_IS_HPS_ON_STATE_CHANGE',
    'GRID_IS_FS_ON_STATE_CHANGE',
    'GRID_METERING_HARDWARE_STATE_CHANGE',
    'FS_RULE_EXECUTION_COMING_UP',
    'FS_RULE_CHANGED',
    'TARIFF_RULE_CHANGED',
    'CLEAN_PANELS_REMINDER',
    'GRID_REVENUE',
    'PASSWORD_RESET',
    'INVITE',
    'CREDIT_SENT',
    'CREDIT_RECEIVED',
    'METER_TOPPED_UP',
    'PAYMENT_REJECTED',
    'SITE_SUBMISSION'
);

CREATE TYPE public.order_actor_type_enum AS ENUM (
    'BANKING_SYSTEM',
    'ORGANIZATION',
    'CONNECTION',
    'METER',
    'AGENT',
    'CUSTOMER'
);

CREATE TYPE public.order_status_enum AS ENUM (
    'INITIALISED',
    'PENDING',
    'COMPLETED',
    'FAILED',
    'CANCELLED',
    'TIMED_OUT',
    'IGNORED'
);

CREATE TYPE public.order_type_enum AS ENUM (
    'ENERGY_TOPUP',
    'CONNECTION_PAYMENT',
    'CONNECTION_REFUND',
    'AGENT_WITHDRAWAL',
    'AGENT_TOPUP',
    'ORGANIZATION_TOPUP',
    'ORGANIZATION_WITHDRAWAL',
    'CUSTOMER_TOPUP'
);

-- organization_type_enum: PLATFORM_OPERATOR added (register #22)
CREATE TYPE public.organization_type_enum AS ENUM (
    'SOLAR_DEVELOPER',
    'LENDER',
    'DATA_AGGREGATOR',
    'PLATFORM_OPERATOR'
);

CREATE TYPE public.payment_channel_enum AS ENUM (
    'USSD',
    'AYRTON',
    'NIFFLER',
    'TELEGRAM'
);

CREATE TYPE public.payment_method_enum AS ENUM (
    'CREDIT_CARD',
    'USSD',
    'BANK_TRANSFER'
);

CREATE TYPE public.solcast_cache_request_type_enum AS ENUM (
    'ESTIMATED_ACTUALS',
    'FORECAST'
);

CREATE TYPE public.transaction_status_enum AS ENUM (
    'SUCCESSFUL',
    'FAILED'
);

CREATE TYPE public.wallet_type_enum AS ENUM (
    'VIRTUAL',
    'REAL'
);

CREATE TYPE public.weather_type_enum AS ENUM (
    'CLOUDY',
    'CLOUDS',
    'SHOWERS',
    'SUNNY',
    'UNKNOWN',
    'CLOUDY_WITH_RAIN'
);

-- =============================================================================
-- Tables
-- =============================================================================
-- 35 of the legacy chain's 57 tables are kept, carried over verbatim except
-- for the column drops/renames and table renames recorded in the deviation
-- register's "Column adjustments" section and register #16.

CREATE TABLE public.accounts (
    id integer NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    full_name character varying,
    email character varying,
    phone character varying,
    telegram_id character varying,
    telegram_link_token character varying,
    deleted_at timestamp(3) without time zone,
    supabase_id uuid,
    organization_id integer
);

CREATE TABLE public.agents (
    id integer NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    grid_id integer,
    account_id integer,
    rls_organization_id integer
);

CREATE TABLE public.api_keys (
    id integer NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    key character varying,
    account_id integer
);

CREATE TABLE public.audits (
    id integer NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    message character varying NOT NULL,
    from_fs_command boolean DEFAULT false NOT NULL,
    author_id integer,
    grid_id integer,
    organization_id integer,
    meter_id integer,
    agent_id integer,
    customer_id integer,
    member_id integer,
    connection_id integer,
    dcu_id integer
);

CREATE TABLE public.banks (
    id integer NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    name character varying NOT NULL,
    external_id character varying NOT NULL
);

CREATE TABLE public.dcus (
    id integer NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    external_reference character varying NOT NULL,
    external_system public.external_system_enum NOT NULL,
    is_online boolean DEFAULT false NOT NULL,
    last_online_at timestamp(3) with time zone,
    is_online_updated_at timestamp(3) with time zone,
    communication_protocol public.communication_protocol_enum,
    grid_id integer,
    last_metering_hardware_install_session_id integer,
    rls_organization_id integer,
    location_geom extensions.geometry(Point,4326)
);

CREATE TABLE public.meters (
    id integer NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    external_reference character varying NOT NULL,
    deleted_at timestamp(3) without time zone,
    balance double precision,
    balance_updated_at timestamp(3) with time zone,
    kwh_credit_available double precision,
    kwh_credit_available_updated_at timestamp(3) with time zone,
    last_non_zero_consumption_at timestamp(3) with time zone,
    is_on boolean DEFAULT false,
    should_be_on boolean DEFAULT false,
    is_on_updated_at timestamp(3) with time zone,
    should_be_on_updated_at timestamp(3) with time zone,
    is_manual_mode_on boolean DEFAULT false NOT NULL,
    is_manual_mode_on_updated_at timestamp(3) with time zone,
    voltage double precision,
    voltage_updated_at timestamp(3) with time zone,
    power double precision,
    power_updated_at timestamp(3) with time zone,
    latitude double precision,
    longitude double precision,
    coord_accuracy double precision DEFAULT '0'::double precision NOT NULL,
    power_limit integer,
    power_limit_updated_at timestamp(3) with time zone,
    power_limit_should_be integer,
    power_limit_should_be_updated_at timestamp(3) with time zone,
    is_starred boolean DEFAULT false NOT NULL,
    external_system public.external_system_enum NOT NULL,
    meter_type public.meter_type_enum DEFAULT 'HPS'::public.meter_type_enum NOT NULL,
    nickname character varying,
    last_seen_at timestamp(3) with time zone,
    issue_check_execution_session character varying,
    issue_check_last_run_at timestamp(3) with time zone,
    pole_id integer,
    meter_phase public.meter_phase_enum DEFAULT 'SINGLE_PHASE'::public.meter_phase_enum NOT NULL,
    last_metering_hardware_install_session_id integer,
    kwh_tariff double precision,
    version character varying,
    power_limit_hps_mode integer DEFAULT 200 NOT NULL,
    communication_protocol public.communication_protocol_enum DEFAULT 'CALIN_LORAWAN'::public.communication_protocol_enum,
    is_cabin_meter boolean DEFAULT false NOT NULL,
    last_encountered_issue_id integer,
    connection_id integer,
    dcu_id integer,
    decoder_key text,
    last_sts_token_issued_at timestamp with time zone,
    rls_grid_id integer,
    rls_organization_id integer,
    is_test_mode_on boolean DEFAULT false NOT NULL,
    connection_metrics jsonb
);

CREATE TABLE public.poles (
    id integer NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    external_reference character varying(10) NOT NULL,
    nickname character varying,
    is_virtual boolean DEFAULT false NOT NULL,
    location_accuracy double precision,
    grid_id integer,
    location_geom extensions.geometry(Point,4326) NOT NULL,
    rls_organization_id integer
);

CREATE TABLE public.connection_requested_meters (
    id integer NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    meter_type public.meter_type_enum NOT NULL,
    meter_phase public.meter_phase_enum NOT NULL,
    fee double precision DEFAULT '0'::double precision NOT NULL,
    deleted_at timestamp(3) without time zone,
    connection_id integer NOT NULL,
    rls_organization_id integer
);

CREATE TABLE public.connections (
    id integer NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp(3) without time zone,
    document_type public.id_document_type_enum DEFAULT 'PASSPORT'::public.id_document_type_enum,
    document_id character varying,
    upload_uuid character varying,
    external_system public.external_system_enum DEFAULT 'EPICOLLECT'::public.external_system_enum,
    paid double precision DEFAULT '0'::double precision NOT NULL,
    currency public.currency_enum NOT NULL,
    women_impacted integer NOT NULL,
    is_lifeline boolean,
    is_public boolean NOT NULL,
    is_commercial boolean NOT NULL,
    is_residential boolean NOT NULL,
    is_building_wired boolean DEFAULT false,
    is_using_led_bulbs boolean DEFAULT false,
    customer_id integer,
    rls_organization_id integer
);

CREATE TABLE public.customers (
    id integer NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    gender public.gender_enum,
    total_connection_fee double precision DEFAULT '0'::double precision NOT NULL,
    total_connection_paid double precision DEFAULT '0'::double precision NOT NULL,
    is_hidden_from_reporting boolean DEFAULT false NOT NULL,
    lives_primarily_in_the_community boolean DEFAULT true NOT NULL,
    latitude double precision,
    longitude double precision,
    generator_owned public.generator_type_enum,
    grid_id integer,
    account_id integer,
    rls_organization_id integer
);

CREATE TABLE public.meter_command_batch_executions (
    id integer NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    pending_count integer DEFAULT 0 NOT NULL,
    processing_count integer DEFAULT 0 NOT NULL,
    successful_count integer DEFAULT 0 NOT NULL,
    failed_count integer DEFAULT 0 NOT NULL,
    processed_count integer DEFAULT 0 NOT NULL,
    total_count integer DEFAULT 0 NOT NULL,
    meter_command_batch_id integer NOT NULL,
    rls_organization_id integer,
    completed_at timestamp with time zone,
    qualified_at timestamp with time zone
);

CREATE TABLE public.meter_command_batches (
    id integer NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    hour integer NOT NULL,
    minute integer NOT NULL,
    is_repeating boolean DEFAULT false NOT NULL,
    grid_id integer,
    fs_command public.fs_command_type_enum,
    author_id integer,
    updated_at timestamp(3) with time zone,
    rls_organization_id integer,
    task_type public.meter_interaction_type_enum
);

CREATE TABLE public.energy_cabins (
    id integer NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    grid_id integer NOT NULL,
    location_geom extensions.geometry(Point,4326) NOT NULL,
    rls_organization_id integer
);

CREATE TABLE public.grids (
    id integer NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    deployed_at timestamp(3) with time zone,
    commissioned_at timestamp(3) with time zone,
    name character varying NOT NULL,
    is_hps_on boolean DEFAULT false NOT NULL,
    is_hps_on_updated_at timestamp(3) with time zone,
    walkthrough_external_id character varying,
    timezone character varying DEFAULT 'UTC'::character varying NOT NULL,
    kwp double precision DEFAULT '0'::double precision NOT NULL,
    kwh double precision DEFAULT '0'::double precision NOT NULL,
    kwp_tariff double precision DEFAULT '0'::double precision NOT NULL,
    kwh_tariff double precision DEFAULT '0'::double precision NOT NULL,
    kwh_tariff_essential_service double precision DEFAULT '0'::double precision NOT NULL,
    kwh_tariff_full_service double precision DEFAULT '0'::double precision NOT NULL,
    current_weather public.weather_type_enum,
    generation_external_system public.external_system_enum DEFAULT 'VICTRON'::public.external_system_enum NOT NULL,
    metering_external_system public.external_system_enum DEFAULT 'CALIN'::public.external_system_enum NOT NULL,
    generation_external_site_id character varying,
    generation_external_gateway_id character varying,
    generation_gateway_last_seen_at timestamp(3) with time zone,
    is_fs_on boolean DEFAULT false NOT NULL,
    is_fs_on_updated_at timestamp(3) with time zone,
    should_fs_be_on boolean DEFAULT false NOT NULL,
    should_fs_be_on_updated_at timestamp(3) with time zone,
    default_hps_connection_fee double precision DEFAULT '0'::double precision NOT NULL,
    default_fs_1_phase_connection_fee double precision DEFAULT '0'::double precision NOT NULL,
    default_fs_3_phase_connection_fee double precision DEFAULT '0'::double precision NOT NULL,
    monthly_rental double precision DEFAULT '0'::double precision NOT NULL,
    is_hidden_from_reporting boolean DEFAULT true NOT NULL,
    is_three_phase_supported boolean DEFAULT false NOT NULL,
    is_using_vsat boolean DEFAULT false NOT NULL,
    is_using_mobile_network boolean DEFAULT false NOT NULL,
    is_hps_on_threshold_kw double precision DEFAULT 0 NOT NULL,
    kwh_per_battery_module double precision,
    identifier integer,
    lifeline_connection_kwh_threshold integer DEFAULT 5 NOT NULL,
    lifeline_connection_days_threshold integer DEFAULT 30 NOT NULL,
    is_panel_cleaning_notification_enabled boolean DEFAULT false NOT NULL,
    is_energised_notification_enabled boolean DEFAULT false NOT NULL,
    is_fs_on_notification_enabled boolean DEFAULT false NOT NULL,
    is_metering_hardware_online_notification_enabled boolean DEFAULT false NOT NULL,
    is_tariff_change_notification_enabled boolean DEFAULT false NOT NULL,
    is_upcoming_fs_control_rule_notification_enabled boolean DEFAULT false NOT NULL,
    is_fs_control_rule_change_notification_enabled boolean DEFAULT false NOT NULL,
    is_automatic_meter_install_enabled boolean DEFAULT false NOT NULL,
    is_automatic_energy_generation_data_sync_enabled boolean DEFAULT false NOT NULL,
    is_automatic_meter_energy_consumption_data_sync_enabled boolean DEFAULT false NOT NULL,
    is_dcu_connectivity_tracking_enabled boolean DEFAULT false NOT NULL,
    is_router_connectivity_tracking_enabled boolean DEFAULT false NOT NULL,
    is_cabin_meter_credit_depleting boolean DEFAULT false NOT NULL,
    telegram_response_path_token character varying,
    telegram_notification_channel_invite_link character varying,
    internal_telegram_group_chat_id character varying,
    internal_telegram_group_thread_id character varying,
    organization_id integer NOT NULL,
    meter_commissioning_initial_credit_kwh real DEFAULT '0'::real NOT NULL,
    is_generation_managed_by_nxt_grid boolean DEFAULT true NOT NULL,
    location_geom extensions.geometry(Point,4326),
    telegram_config jsonb DEFAULT '{}'::jsonb,
    feature_access_config jsonb DEFAULT '{}'::jsonb NOT NULL
);

CREATE TABLE public.issues (
    id integer NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    issue_type public.issue_type_enum NOT NULL,
    issue_status public.issue_status_enum DEFAULT 'OPEN'::public.issue_status_enum NOT NULL,
    external_tracking_system public.external_system_enum DEFAULT 'JIRA'::public.external_system_enum NOT NULL,
    started_at timestamp(3) with time zone,
    closed_at timestamp(3) with time zone,
    external_tracking_reference character varying,
    meter_id integer,
    rls_organization_id integer
);

CREATE TABLE public.members (
    id integer NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    subscribed_to_telegram_revenue_notifications boolean DEFAULT false NOT NULL,
    member_type public.member_type_enum DEFAULT 'DEVELOPER'::public.member_type_enum NOT NULL,
    account_id integer,
    busy_commissioning_id integer,
    training_level smallint DEFAULT '0'::smallint NOT NULL,
    rls_organization_id integer,
    hidden boolean DEFAULT false NOT NULL
);

CREATE TABLE public.meter_commissionings (
    id integer NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    meter_commissioning_status public.meter_commissioning_status_enum DEFAULT 'PROCESSING'::public.meter_commissioning_status_enum NOT NULL,
    metering_hardware_install_session_id integer,
    rls_organization_id integer
);

CREATE TABLE public.meter_interactions (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    meter_id integer NOT NULL,
    token text,
    order_id integer,
    transactive_kwh real,
    target_power_limit integer,
    result_value jsonb,
    meter_interaction_type public.meter_interaction_type_enum NOT NULL,
    meter_interaction_status public.meter_interaction_status_enum DEFAULT 'QUEUED'::public.meter_interaction_status_enum NOT NULL,
    batch_execution_id integer,
    meter_commissioning_id integer,
    delivery_failure_history jsonb,
    payload_data jsonb
);

CREATE TABLE public.metering_hardware_imports (
    id integer NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    metering_hardware_import_operation public.mhi_operation_enum DEFAULT 'ADD'::public.mhi_operation_enum NOT NULL,
    metering_hardware_import_status public.mhi_status_enum DEFAULT 'PENDING'::public.mhi_status_enum NOT NULL,
    metering_hardware_install_session_id integer NOT NULL,
    lock_session character varying,
    rls_organization_id integer
);

CREATE TABLE public.metering_hardware_install_sessions (
    id integer NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    dcu_id integer,
    meter_id integer,
    author_id integer,
    last_meter_commissioning_id integer,
    last_metering_hardware_import_id integer,
    rls_organization_id integer
);

CREATE TABLE public.mppts (
    id integer NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    external_reference character varying NOT NULL,
    external_id character varying NOT NULL,
    external_system public.external_system_enum DEFAULT 'VICTRON'::public.external_system_enum NOT NULL,
    kw double precision,
    azimuth double precision,
    tilt double precision,
    installed_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp(3) with time zone,
    mppt_type public.mppt_type_enum DEFAULT 'MPPT'::public.mppt_type_enum NOT NULL,
    grid_id integer,
    rls_organization_id integer
);

CREATE TABLE public.notes (
    id integer NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    message character varying,
    customer_id integer,
    connection_id integer,
    meter_id integer,
    author_id integer,
    rls_organization_id integer
);

CREATE TABLE public.notification_parameters (
    id integer NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    parameters json
);

CREATE TABLE public.notifications (
    id integer NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    connector_external_system public.external_system_enum,
    carrier_external_system public.external_system_enum,
    notification_type public.notification_type_enum NOT NULL,
    notification_status public.notification_status_enum NOT NULL,
    external_reference character varying,
    notification_parameter_id integer,
    grid_id integer,
    organization_id integer,
    account_id integer,
    lock_session character varying,
    message character varying,
    phone character varying,
    subject character varying,
    email character varying,
    chat_id character varying,
    thread_id character varying
);

CREATE TABLE public.orders (
    id integer NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    amount double precision NOT NULL,
    order_status public.order_status_enum DEFAULT 'PENDING'::public.order_status_enum NOT NULL,
    lock_session character varying,
    external_reference character varying,
    currency public.currency_enum NOT NULL,
    tariff_type public.meter_type_enum,
    tariff double precision DEFAULT '-1'::double precision NOT NULL,
    payment_method public.payment_method_enum,
    payment_channel public.payment_channel_enum,
    author_id integer,
    historical_grid_id integer,
    meta_author_type public.account_type_enum,
    meta_author_name character varying,
    meta_author_id integer,
    meta_order_type public.order_type_enum,
    meta_sender_id integer,
    meta_sender_name character varying,
    meta_receiver_name character varying,
    meta_receiver_name_part_2 character varying,
    meta_sender_name_part_2 character varying,
    meta_receiver_id integer,
    meta_sender_type public.order_actor_type_enum,
    meta_receiver_type public.order_actor_type_enum,
    meta_is_hidden_from_reporting boolean,
    sender_wallet_id integer,
    receiver_wallet_id integer,
    ussd_session_id integer,
    meta_receiver_id_part_2 integer,
    rls_organization_id integer,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.organizations (
    id integer NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    name character varying NOT NULL,
    formal_name character varying,
    email character varying,
    epicollect_contract_survey_slug character varying,
    epicollect_contract_survey_secret character varying,
    epicollect_contract_survey_client_id character varying,
    epicollect_contract_last_sync_at timestamp(3) with time zone,
    developer_group_telegram_chat_id character varying,
    deleted_at timestamp with time zone,
    organization_type public.organization_type_enum DEFAULT 'SOLAR_DEVELOPER'::public.organization_type_enum NOT NULL
);

CREATE TABLE public.pd_site_submissions (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    author_full_name text NOT NULL,
    author_email text NOT NULL,
    author_organization_name text NOT NULL,
    site_name character varying NOT NULL,
    site_details jsonb NOT NULL,
    outline_geom extensions.geometry(Polygon,4326),
    deleted_at timestamp with time zone,
    location_geom extensions.geometry(Point,4326),
    organization_id integer,
    author_organization_id integer,
    buildings_geo_flat jsonb,
    distribution_geo_flat jsonb,
    meta_geo_flat jsonb,
    poles_geo_flat jsonb
);

CREATE TABLE public.pd_sites (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    organization_id integer,
    name text NOT NULL,
    deleted_at timestamp with time zone,
    location_geom extensions.geometry(Point,4326),
    outline_geom extensions.geometry(Polygon,4326),
    operations_grid_id integer
);

CREATE TABLE public.routers (
    id integer NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    external_reference character varying NOT NULL,
    external_system public.external_system_enum DEFAULT 'ZEROTIER'::public.external_system_enum NOT NULL,
    is_online boolean DEFAULT false NOT NULL,
    is_online_updated_at timestamp(3) with time zone,
    deleted_at timestamp(3) with time zone,
    grid_id integer,
    rls_organization_id integer
);

CREATE TABLE public.solcast_cache (
    id integer NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    request_type public.solcast_cache_request_type_enum NOT NULL,
    latitude numeric(8,6) NOT NULL,
    longitude numeric(9,6) NOT NULL,
    tilt numeric(10,3) NOT NULL,
    azimuth numeric(10,3) NOT NULL,
    capacity_kwp numeric(10,3) NOT NULL,
    install_date character varying NOT NULL,
    response text NOT NULL
);

CREATE TABLE public.transactions (
    id bigint NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    amount double precision NOT NULL,
    transaction_status public.transaction_status_enum NOT NULL,
    balance_before double precision DEFAULT '-1'::double precision NOT NULL,
    balance_after double precision DEFAULT '-1'::double precision NOT NULL,
    wallet_id integer,
    order_id integer,
    rls_organization_id integer
);

CREATE TABLE public.ussd_session_hops (
    id integer NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    text character varying,
    phone character varying,
    network_code character varying,
    service_code character varying,
    ussd_session_id integer
);

CREATE TABLE public.ussd_sessions (
    id integer NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    phone character varying NOT NULL,
    amount double precision,
    external_reference character varying,
    external_system public.external_system_enum NOT NULL,
    is_using_other_option boolean DEFAULT false NOT NULL,
    account_id integer,
    meter_id integer,
    bank_id integer
);

CREATE TABLE public.wallets (
    id integer NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    organization_id integer,
    agent_id integer,
    customer_id integer,
    meter_id integer,
    lock_session character varying,
    balance double precision DEFAULT '0'::double precision NOT NULL,
    balance_updated_at timestamp(3) with time zone,
    identifier character varying,
    wallet_type public.wallet_type_enum DEFAULT 'REAL'::public.wallet_type_enum NOT NULL,
    connection_id integer,
    rls_organization_id integer
);

-- =============================================================================
-- Sequences
-- =============================================================================
-- One sequence (or identity-column sequence) per kept table's primary key.
-- 3 tables (meter_interactions, pd_sites, pd_site_submissions) use identity
-- columns rather than a standalone sequence + DEFAULT nextval(); pg_dump
-- renders both forms, kept as dumped.

CREATE SEQUENCE public.accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.accounts ALTER COLUMN id SET DEFAULT nextval('public.accounts_id_seq'::regclass);

ALTER SEQUENCE public.accounts_id_seq OWNED BY public.accounts.id;

CREATE SEQUENCE public.agents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.agents ALTER COLUMN id SET DEFAULT nextval('public.agents_id_seq'::regclass);

ALTER SEQUENCE public.agents_id_seq OWNED BY public.agents.id;

CREATE SEQUENCE public.api_keys_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.api_keys ALTER COLUMN id SET DEFAULT nextval('public.api_keys_id_seq'::regclass);

ALTER SEQUENCE public.api_keys_id_seq OWNED BY public.api_keys.id;

CREATE SEQUENCE public.audits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.audits ALTER COLUMN id SET DEFAULT nextval('public.audits_id_seq'::regclass);

ALTER SEQUENCE public.audits_id_seq OWNED BY public.audits.id;

CREATE SEQUENCE public.banks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.banks ALTER COLUMN id SET DEFAULT nextval('public.banks_id_seq'::regclass);

ALTER SEQUENCE public.banks_id_seq OWNED BY public.banks.id;

CREATE SEQUENCE public.dcus_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.dcus ALTER COLUMN id SET DEFAULT nextval('public.dcus_id_seq'::regclass);

ALTER SEQUENCE public.dcus_id_seq OWNED BY public.dcus.id;

CREATE SEQUENCE public.meters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.meters ALTER COLUMN id SET DEFAULT nextval('public.meters_id_seq'::regclass);

ALTER SEQUENCE public.meters_id_seq OWNED BY public.meters.id;

CREATE SEQUENCE public.poles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.poles ALTER COLUMN id SET DEFAULT nextval('public.poles_id_seq'::regclass);

ALTER SEQUENCE public.poles_id_seq OWNED BY public.poles.id;

CREATE SEQUENCE public.connection_requested_meters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.connection_requested_meters ALTER COLUMN id SET DEFAULT nextval('public.connection_requested_meters_id_seq'::regclass);

ALTER SEQUENCE public.connection_requested_meters_id_seq OWNED BY public.connection_requested_meters.id;

CREATE SEQUENCE public.connections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.connections ALTER COLUMN id SET DEFAULT nextval('public.connections_id_seq'::regclass);

ALTER SEQUENCE public.connections_id_seq OWNED BY public.connections.id;

CREATE SEQUENCE public.customers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.customers ALTER COLUMN id SET DEFAULT nextval('public.customers_id_seq'::regclass);

ALTER SEQUENCE public.customers_id_seq OWNED BY public.customers.id;

CREATE SEQUENCE public.meter_command_batch_executions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.meter_command_batch_executions ALTER COLUMN id SET DEFAULT nextval('public.meter_command_batch_executions_id_seq'::regclass);

ALTER SEQUENCE public.meter_command_batch_executions_id_seq OWNED BY public.meter_command_batch_executions.id;

CREATE SEQUENCE public.meter_command_batches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.meter_command_batches ALTER COLUMN id SET DEFAULT nextval('public.meter_command_batches_id_seq'::regclass);

ALTER SEQUENCE public.meter_command_batches_id_seq OWNED BY public.meter_command_batches.id;

CREATE SEQUENCE public.energy_cabins_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.energy_cabins ALTER COLUMN id SET DEFAULT nextval('public.energy_cabins_id_seq'::regclass);

ALTER SEQUENCE public.energy_cabins_id_seq OWNED BY public.energy_cabins.id;

CREATE SEQUENCE public.grids_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.grids ALTER COLUMN id SET DEFAULT nextval('public.grids_id_seq'::regclass);

ALTER SEQUENCE public.grids_id_seq OWNED BY public.grids.id;

CREATE SEQUENCE public.issues_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.issues ALTER COLUMN id SET DEFAULT nextval('public.issues_id_seq'::regclass);

ALTER SEQUENCE public.issues_id_seq OWNED BY public.issues.id;

CREATE SEQUENCE public.members_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.members ALTER COLUMN id SET DEFAULT nextval('public.members_id_seq'::regclass);

ALTER SEQUENCE public.members_id_seq OWNED BY public.members.id;

CREATE SEQUENCE public.meter_commissionings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.meter_commissionings ALTER COLUMN id SET DEFAULT nextval('public.meter_commissionings_id_seq'::regclass);

ALTER SEQUENCE public.meter_commissionings_id_seq OWNED BY public.meter_commissionings.id;

ALTER TABLE public.meter_interactions ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.meter_interactions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE SEQUENCE public.metering_hardware_imports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.metering_hardware_imports ALTER COLUMN id SET DEFAULT nextval('public.metering_hardware_imports_id_seq'::regclass);

ALTER SEQUENCE public.metering_hardware_imports_id_seq OWNED BY public.metering_hardware_imports.id;

CREATE SEQUENCE public.metering_hardware_install_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.metering_hardware_install_sessions ALTER COLUMN id SET DEFAULT nextval('public.metering_hardware_install_sessions_id_seq'::regclass);

ALTER SEQUENCE public.metering_hardware_install_sessions_id_seq OWNED BY public.metering_hardware_install_sessions.id;

CREATE SEQUENCE public.mppts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.mppts ALTER COLUMN id SET DEFAULT nextval('public.mppts_id_seq'::regclass);

ALTER SEQUENCE public.mppts_id_seq OWNED BY public.mppts.id;

CREATE SEQUENCE public.notes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.notes ALTER COLUMN id SET DEFAULT nextval('public.notes_id_seq'::regclass);

ALTER SEQUENCE public.notes_id_seq OWNED BY public.notes.id;

CREATE SEQUENCE public.notification_parameters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.notification_parameters ALTER COLUMN id SET DEFAULT nextval('public.notification_parameters_id_seq'::regclass);

ALTER SEQUENCE public.notification_parameters_id_seq OWNED BY public.notification_parameters.id;

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;

CREATE SEQUENCE public.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;

CREATE SEQUENCE public.organizations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.organizations ALTER COLUMN id SET DEFAULT nextval('public.organizations_id_seq'::regclass);

ALTER SEQUENCE public.organizations_id_seq OWNED BY public.organizations.id;

ALTER TABLE public.pd_site_submissions ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.pd_site_submissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

ALTER TABLE public.pd_sites ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.pd_sites_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE SEQUENCE public.routers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.routers ALTER COLUMN id SET DEFAULT nextval('public.routers_id_seq'::regclass);

ALTER SEQUENCE public.routers_id_seq OWNED BY public.routers.id;

CREATE SEQUENCE public.solcast_cache_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.solcast_cache ALTER COLUMN id SET DEFAULT nextval('public.solcast_cache_id_seq'::regclass);

ALTER SEQUENCE public.solcast_cache_id_seq OWNED BY public.solcast_cache.id;

CREATE SEQUENCE public.transactions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.transactions ALTER COLUMN id SET DEFAULT nextval('public.transactions_id_seq'::regclass);

ALTER SEQUENCE public.transactions_id_seq OWNED BY public.transactions.id;

CREATE SEQUENCE public.ussd_session_hops_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.ussd_session_hops ALTER COLUMN id SET DEFAULT nextval('public.ussd_session_hops_id_seq'::regclass);

ALTER SEQUENCE public.ussd_session_hops_id_seq OWNED BY public.ussd_session_hops.id;

CREATE SEQUENCE public.ussd_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.ussd_sessions ALTER COLUMN id SET DEFAULT nextval('public.ussd_sessions_id_seq'::regclass);

ALTER SEQUENCE public.ussd_sessions_id_seq OWNED BY public.ussd_sessions.id;

CREATE SEQUENCE public.wallets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.wallets ALTER COLUMN id SET DEFAULT nextval('public.wallets_id_seq'::regclass);

ALTER SEQUENCE public.wallets_id_seq OWNED BY public.wallets.id;

-- =============================================================================
-- Views
-- =============================================================================
-- 3 of the legacy chain's 4 views are kept (agents_with_account,
-- customers_with_account, meters_with_account_and_statuses), with the same
-- column drops applied as their underlying tables. batch_commands is dropped
-- (register #9 — read path for the dropped directive-batch tables).

CREATE VIEW public.agents_with_account WITH (security_invoker='true') AS
 SELECT agents.id,
    agents.created_at,
    agents.grid_id,
    agents.account_id,
    accounts.full_name,
    accounts.phone,
    accounts.deleted_at
   FROM (public.agents
     JOIN public.accounts ON ((agents.account_id = accounts.id)));

CREATE VIEW public.customers_with_account WITH (security_invoker='true') AS
 SELECT c.id,
    c.created_at,
    c.gender,
    c.total_connection_fee,
    c.total_connection_paid,
    c.is_hidden_from_reporting,
    c.lives_primarily_in_the_community,
    c.latitude,
    c.longitude,
    c.generator_owned,
    c.grid_id,
    c.account_id,
    a.full_name,
    a.phone,
    a.deleted_at,
    (c.total_connection_paid >= c.total_connection_fee) AS has_fully_paid_connection_fees,
    ( SELECT string_agg((m.external_reference)::text, ', '::text) AS string_agg
           FROM (public.connections conn
             JOIN public.meters m ON ((m.connection_id = conn.id)))
          WHERE (conn.customer_id = c.id)) AS meter
   FROM (public.customers c
     JOIN public.accounts a ON ((c.account_id = a.id)));

CREATE VIEW public.meters_with_account_and_statuses WITH (security_invoker='true') AS
 SELECT m.id,
    m.created_at,
    m.external_reference,
    m.deleted_at,
    m.balance,
    m.balance_updated_at,
    m.kwh_credit_available,
    m.kwh_credit_available_updated_at,
    m.last_non_zero_consumption_at,
    m.is_on,
    m.should_be_on,
    m.is_on_updated_at,
    m.should_be_on_updated_at,
    m.is_manual_mode_on,
    m.is_manual_mode_on_updated_at,
    m.voltage,
    m.voltage_updated_at,
    m.power,
    m.power_updated_at,
    m.latitude,
    m.longitude,
    m.coord_accuracy,
    m.power_limit,
    m.power_limit_updated_at,
    m.power_limit_should_be,
    m.power_limit_should_be_updated_at,
    m.is_starred,
    m.external_system,
    m.meter_type,
    m.nickname,
    m.last_seen_at,
    m.issue_check_execution_session,
    m.issue_check_last_run_at,
    m.pole_id,
    m.meter_phase,
    m.last_metering_hardware_install_session_id,
    m.kwh_tariff,
    m.version,
    m.power_limit_hps_mode,
    m.communication_protocol,
    m.is_cabin_meter,
    m.last_encountered_issue_id,
    m.connection_id,
    m.dcu_id,
    m.decoder_key,
    m.last_sts_token_issued_at,
    m.rls_grid_id,
    m.rls_organization_id,
    m.is_test_mode_on,
    c.grid_id,
    c.is_hidden_from_reporting,
    a.full_name,
    a.phone,
    (
        CASE
            WHEN (m.last_metering_hardware_install_session_id IS NULL) THEN 'SUCCESSFUL'::text
            WHEN ((i.metering_hardware_import_status = 'PENDING'::public.mhi_status_enum) OR (com.meter_commissioning_status = 'PENDING'::public.meter_commissioning_status_enum)) THEN 'PENDING'::text
            WHEN ((i.metering_hardware_import_status = 'PROCESSING'::public.mhi_status_enum) OR (com.meter_commissioning_status = 'PROCESSING'::public.meter_commissioning_status_enum)) THEN 'PROCESSING'::text
            WHEN (com.meter_commissioning_status = 'SUCCESSFUL'::public.meter_commissioning_status_enum) THEN 'SUCCESSFUL'::text
            WHEN ((i.metering_hardware_import_status = 'FAILED'::public.mhi_status_enum) OR (com.meter_commissioning_status = 'FAILED'::public.meter_commissioning_status_enum) OR ((i.metering_hardware_import_status = 'SUCCESSFUL'::public.mhi_status_enum) AND (com.meter_commissioning_status IS NULL))) THEN 'FAILED'::text
            ELSE NULL::text
        END)::public.mhi_status_enum AS install_status,
        CASE
            WHEN (iss.issue_status = 'OPEN'::public.issue_status_enum) THEN iss.issue_type
            ELSE NULL::public.issue_type_enum
        END AS open_issue
   FROM (((((((public.meters m
     JOIN public.connections conn ON ((m.connection_id = conn.id)))
     JOIN public.customers c ON ((conn.customer_id = c.id)))
     JOIN public.accounts a ON ((c.account_id = a.id)))
     LEFT JOIN public.metering_hardware_install_sessions install_session ON ((m.last_metering_hardware_install_session_id = install_session.id)))
     LEFT JOIN public.metering_hardware_imports i ON ((install_session.last_metering_hardware_import_id = i.id)))
     LEFT JOIN public.meter_commissionings com ON ((install_session.last_meter_commissioning_id = com.id)))
     LEFT JOIN public.issues iss ON ((m.last_encountered_issue_id = iss.id)));

-- =============================================================================
-- Constraints
-- =============================================================================
-- Primary key and unique constraints first, then foreign keys.
-- FK cycle hardening (register #34): 5 denormalized "latest pointer" FKs get
-- ON DELETE SET NULL so a referenced row's deletion doesn't require deleting
-- the pointer's owner; their 5 structural back-pointer counterparts are left
-- at the implicit NO ACTION default (deleting the pointed-to row must fail,
-- or cascade through the owning aggregate root, unless the pointer is
-- cleared first).

ALTER TABLE ONLY public.connections
    ADD CONSTRAINT "PK_0a1f844af3122354cbd487a8d03" PRIMARY KEY (id);

ALTER TABLE ONLY public.meters
    ADD CONSTRAINT "PK_0a71b52dbb545fa36efaf070583" PRIMARY KEY (id);

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT "PK_133ec679a801fab5e070f73d3ea" PRIMARY KEY (id);

ALTER TABLE ONLY public.poles
    ADD CONSTRAINT "PK_1f4336016e8de1d62acb05ce829" PRIMARY KEY (id);

ALTER TABLE ONLY public.members
    ADD CONSTRAINT "PK_28b53062261b996d9c99fa12404" PRIMARY KEY (id);

ALTER TABLE ONLY public.notification_parameters
    ADD CONSTRAINT "PK_338f36e72b69406bed36e054e09" PRIMARY KEY (id);

ALTER TABLE ONLY public.banks
    ADD CONSTRAINT "PK_3975b5f684ec241e3901db62d77" PRIMARY KEY (id);

ALTER TABLE ONLY public.metering_hardware_install_sessions
    ADD CONSTRAINT "PK_4eb998262e5c773a89dfe3ea0e1" PRIMARY KEY (id);

ALTER TABLE ONLY public.ussd_session_hops
    ADD CONSTRAINT "PK_56d984bae21ce6e86848a8a3c04" PRIMARY KEY (id);

ALTER TABLE ONLY public.energy_cabins
    ADD CONSTRAINT "PK_59ecb7965974e45fdc2f243bda7" PRIMARY KEY (id);

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT "PK_5a7a02c20412299d198e097a8fe" PRIMARY KEY (id);

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT "PK_5c8a79801b44bd27b79228e1dad" PRIMARY KEY (id);

ALTER TABLE ONLY public.metering_hardware_imports
    ADD CONSTRAINT "PK_665b32b395a7675648ed77da4f6" PRIMARY KEY (id);

ALTER TABLE ONLY public.meter_commissionings
    ADD CONSTRAINT "PK_69fce91302a5dc8dd3db274717b" PRIMARY KEY (id);

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY (id);

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT "PK_6b031fcd0863e3f6b44230163f9" PRIMARY KEY (id);

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY (id);

ALTER TABLE ONLY public.dcus
    ADD CONSTRAINT "PK_82192607fa5119101a78fe53b7d" PRIMARY KEY (id);

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT "PK_8402e5df5a30a229380e83e4f7e" PRIMARY KEY (id);

ALTER TABLE ONLY public.grids
    ADD CONSTRAINT "PK_840d40fdcde1e935afd43082aca" PRIMARY KEY (id);

ALTER TABLE ONLY public.meter_command_batches
    ADD CONSTRAINT "PK_92d424811a3fd49a8020eadb97a" PRIMARY KEY (id);

ALTER TABLE ONLY public.meter_command_batch_executions
    ADD CONSTRAINT "PK_9494ab23abdfe4e59f3f29842d5" PRIMARY KEY (id);

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT "PK_9c653f28ae19c5884d5baf6a1d9" PRIMARY KEY (id);

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT "PK_9d8ecbbeff46229c700f0449257" PRIMARY KEY (id);

ALTER TABLE ONLY public.solcast_cache
    ADD CONSTRAINT "PK_a0b1d6bdbc5ca0056201a1c6dd0" PRIMARY KEY (id);

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT "PK_a219afd8dd77ed80f5a862f1db9" PRIMARY KEY (id);

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT "PK_af6206538ea96c4e77e9f400c3d" PRIMARY KEY (id);

ALTER TABLE ONLY public.audits
    ADD CONSTRAINT "PK_b2d7a2089999197dc7024820f28" PRIMARY KEY (id);

ALTER TABLE ONLY public.routers
    ADD CONSTRAINT "PK_b6d283f1e40d4942dedbc0cb27a" PRIMARY KEY (id);

ALTER TABLE ONLY public.ussd_sessions
    ADD CONSTRAINT "PK_c18f16f36e79b2fb87783476830" PRIMARY KEY (id);

ALTER TABLE ONLY public.mppts
    ADD CONSTRAINT "PK_c8a4dc57b932c173f6c579804c0" PRIMARY KEY (id);

ALTER TABLE ONLY public.connection_requested_meters
    ADD CONSTRAINT "PK_ef90f8d1aa3055757e0ff8e4aa7" PRIMARY KEY (id);

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT "REL_13bf998d703e7d4c7b9a90f4f7" UNIQUE (supabase_id);

ALTER TABLE ONLY public.metering_hardware_install_sessions
    ADD CONSTRAINT "REL_4eb64f5decb7250cfa993410c1" UNIQUE (last_meter_commissioning_id);

ALTER TABLE ONLY public.meters
    ADD CONSTRAINT "REL_5606d6ec5ab568377509edc526" UNIQUE (last_encountered_issue_id);

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT "REL_6580899a2293de27787376887f" UNIQUE (customer_id);

ALTER TABLE ONLY public.meters
    ADD CONSTRAINT "REL_86d4557a79e374b5c55cb3b66d" UNIQUE (last_metering_hardware_install_session_id);

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT "REL_8db1f4e4f8122bd25d50ad96b2" UNIQUE (meter_id);

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "REL_92081072063eaf51300ab6c267" UNIQUE (ussd_session_id);

ALTER TABLE ONLY public.dcus
    ADD CONSTRAINT "REL_9334b587e6e5291f8ccd1b11c4" UNIQUE (last_metering_hardware_install_session_id);

ALTER TABLE ONLY public.metering_hardware_install_sessions
    ADD CONSTRAINT "REL_be64a09dc738420a409cb96026" UNIQUE (last_metering_hardware_import_id);

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT "REL_df520decc9e003a843d8edd986" UNIQUE (account_id);

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT "REL_e63e504d8e35ef37a2c56b75eb" UNIQUE (connection_id);

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT "REL_ebcc29963874e55053e8ee80be" UNIQUE (account_id);

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT "REL_f499c61c6d6a0ac3f794d966ed" UNIQUE (organization_id);

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT "REL_f5782e05e8688f0cfbb5c4a52c" UNIQUE (agent_id);

ALTER TABLE ONLY public.members
    ADD CONSTRAINT "REL_fd9dfb97e21b75fc45d42aa614" UNIQUE (account_id);

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT "UQ_0ec8c228e89a95aeb4af9ee3226" UNIQUE (telegram_link_token);

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT "UQ_3ffa9ce30e56b6d2abf0a465f5f" UNIQUE (telegram_id);

ALTER TABLE ONLY public.grids
    ADD CONSTRAINT "UQ_61f08f04c9f0f1d3afd24b9be0b" UNIQUE (identifier);

ALTER TABLE ONLY public.poles
    ADD CONSTRAINT "UQ_67112e4334d7090a571d2fff42a" UNIQUE (external_reference);

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT "UQ_e42cf55faeafdcce01a82d24849" UNIQUE (key);

ALTER TABLE ONLY public.meter_interactions
    ADD CONSTRAINT meter_interactions_order_id_key UNIQUE (order_id);

ALTER TABLE ONLY public.meter_interactions
    ADD CONSTRAINT meter_interactions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.pd_site_submissions
    ADD CONSTRAINT pd_public_submissions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.pd_sites
    ADD CONSTRAINT pd_sites_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.meters
    ADD CONSTRAINT "FK_04e1a755d5b760f681e5205557d" FOREIGN KEY (dcu_id) REFERENCES public.dcus(id);

ALTER TABLE ONLY public.mppts
    ADD CONSTRAINT "FK_0a681c1d6d0a67331bbc6956427" FOREIGN KEY (grid_id) REFERENCES public.grids(id);

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "FK_0b03d1bc1cff784570333129e63" FOREIGN KEY (historical_grid_id) REFERENCES public.grids(id);

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT "FK_0b171330be0cb621f8d73b87a9e" FOREIGN KEY (wallet_id) REFERENCES public.wallets(id);

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT "FK_13bf998d703e7d4c7b9a90f4f76" FOREIGN KEY (supabase_id) REFERENCES auth.users(id);

ALTER TABLE ONLY public.audits
    ADD CONSTRAINT "FK_18c521072a6ca9d57365ffb24fe" FOREIGN KEY (agent_id) REFERENCES public.agents(id);

ALTER TABLE ONLY public.audits
    ADD CONSTRAINT "FK_236a383b1007cf64f0c8c7f6534" FOREIGN KEY (customer_id) REFERENCES public.customers(id);

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT "FK_238d61e0f8ac37278f726efac20" FOREIGN KEY (organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.dcus
    ADD CONSTRAINT "FK_254c3db39098da62eb3f96f0006" FOREIGN KEY (grid_id) REFERENCES public.grids(id);

ALTER TABLE ONLY public.poles
    ADD CONSTRAINT "FK_2c21d74185234b0dd39588a4d36" FOREIGN KEY (grid_id) REFERENCES public.grids(id);

ALTER TABLE ONLY public.audits
    ADD CONSTRAINT "FK_2d52a7fc85cfbb0421af977766e" FOREIGN KEY (grid_id) REFERENCES public.grids(id);

ALTER TABLE ONLY public.audits
    ADD CONSTRAINT "FK_2fc5f64b328675b5203d54c7929" FOREIGN KEY (connection_id) REFERENCES public.connections(id);

ALTER TABLE ONLY public.audits
    ADD CONSTRAINT "FK_336b627b254b70b0702436e6aff" FOREIGN KEY (author_id) REFERENCES public.accounts(id);

ALTER TABLE ONLY public.metering_hardware_install_sessions
    ADD CONSTRAINT "FK_35239534a89f0d6dab2612645eb" FOREIGN KEY (author_id) REFERENCES public.accounts(id);

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT "FK_35b89a50cb9203dccff44136519" FOREIGN KEY (author_id) REFERENCES public.accounts(id);

ALTER TABLE ONLY public.connections
    ADD CONSTRAINT "FK_37f79eb1e29a53cc582fbb805e0" FOREIGN KEY (customer_id) REFERENCES public.customers(id);

ALTER TABLE ONLY public.ussd_sessions
    ADD CONSTRAINT "FK_3a2606011b8d9f1de07de2bf0a8" FOREIGN KEY (meter_id) REFERENCES public.meters(id);

ALTER TABLE ONLY public.routers
    ADD CONSTRAINT "FK_3c3ddc58369a9a8147776e39f40" FOREIGN KEY (grid_id) REFERENCES public.grids(id);

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT "FK_3cb0558ed36997f1d9ecc1118e7" FOREIGN KEY (order_id) REFERENCES public.orders(id);

ALTER TABLE ONLY public.metering_hardware_install_sessions
    ADD CONSTRAINT "FK_3f770c153b3333ad1d29cfbf784" FOREIGN KEY (meter_id) REFERENCES public.meters(id);

ALTER TABLE ONLY public.grids
    ADD CONSTRAINT "FK_433ef6a589cd535dff42b34612e" FOREIGN KEY (organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.audits
    ADD CONSTRAINT "FK_4a300197465db92edfc5563d20b" FOREIGN KEY (meter_id) REFERENCES public.meters(id);

ALTER TABLE ONLY public.ussd_sessions
    ADD CONSTRAINT "FK_4cad92626a62976ac0b49244d2e" FOREIGN KEY (bank_id) REFERENCES public.banks(id);

ALTER TABLE ONLY public.metering_hardware_install_sessions
    ADD CONSTRAINT "FK_4eb64f5decb7250cfa993410c1e" FOREIGN KEY (last_meter_commissioning_id) REFERENCES public.meter_commissionings(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT "FK_51a88ee1d4fceb047e7cfda3baa" FOREIGN KEY (grid_id) REFERENCES public.grids(id);

ALTER TABLE ONLY public.meters
    ADD CONSTRAINT "FK_5606d6ec5ab568377509edc5267" FOREIGN KEY (last_encountered_issue_id) REFERENCES public.issues(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "FK_576b0e9af0bec469bff33b965aa" FOREIGN KEY (receiver_wallet_id) REFERENCES public.wallets(id);

ALTER TABLE ONLY public.metering_hardware_imports
    ADD CONSTRAINT "FK_5c2bb31b2e45c3f1da0b72071a2" FOREIGN KEY (metering_hardware_install_session_id) REFERENCES public.metering_hardware_install_sessions(id);

ALTER TABLE ONLY public.meter_command_batches
    ADD CONSTRAINT "FK_5c44fae05dc443720f62664e563" FOREIGN KEY (grid_id) REFERENCES public.grids(id);

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT "FK_5ec9536f852f1923097ba1ecdac" FOREIGN KEY (meter_id) REFERENCES public.meters(id);

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "FK_60816230893327daacc86ab41c8" FOREIGN KEY (author_id) REFERENCES public.accounts(id);

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT "FK_6580899a2293de27787376887fa" FOREIGN KEY (customer_id) REFERENCES public.customers(id);

ALTER TABLE ONLY public.meter_commissionings
    ADD CONSTRAINT "FK_6684f0790c54ed3d441f78df91a" FOREIGN KEY (metering_hardware_install_session_id) REFERENCES public.metering_hardware_install_sessions(id);

ALTER TABLE ONLY public.meter_command_batches
    ADD CONSTRAINT "FK_6e26cb6e966f484f0f897127c84" FOREIGN KEY (author_id) REFERENCES public.accounts(id);

ALTER TABLE ONLY public.meter_command_batch_executions
    ADD CONSTRAINT "FK_7b0737005e7c358392d87ebb329" FOREIGN KEY (meter_command_batch_id) REFERENCES public.meter_command_batches(id);

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT "FK_7b15f3fbbedf51a1a3d21583b7e" FOREIGN KEY (meter_id) REFERENCES public.meters(id);

ALTER TABLE ONLY public.meters
    ADD CONSTRAINT "FK_86d4557a79e374b5c55cb3b66d8" FOREIGN KEY (last_metering_hardware_install_session_id) REFERENCES public.metering_hardware_install_sessions(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT "FK_8db1f4e4f8122bd25d50ad96b26" FOREIGN KEY (meter_id) REFERENCES public.meters(id);

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "FK_8f12fe9c7b078122adcae80375d" FOREIGN KEY (sender_wallet_id) REFERENCES public.wallets(id);

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "FK_92081072063eaf51300ab6c267d" FOREIGN KEY (ussd_session_id) REFERENCES public.ussd_sessions(id);

ALTER TABLE ONLY public.dcus
    ADD CONSTRAINT "FK_9334b587e6e5291f8ccd1b11c44" FOREIGN KEY (last_metering_hardware_install_session_id) REFERENCES public.metering_hardware_install_sessions(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "FK_982f77636cb1da8e76745949530" FOREIGN KEY (notification_parameter_id) REFERENCES public.notification_parameters(id);

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT "FK_9bb7cb7efc780ec4d3dec34354f" FOREIGN KEY (grid_id) REFERENCES public.grids(id);

ALTER TABLE ONLY public.meters
    ADD CONSTRAINT "FK_a11871575f7ddb95e567d842bc6" FOREIGN KEY (pole_id) REFERENCES public.poles(id);

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "FK_a1ec3b4b4f2017665b534e60256" FOREIGN KEY (account_id) REFERENCES public.accounts(id);

ALTER TABLE ONLY public.members
    ADD CONSTRAINT "FK_a9da2a35fdd2cd46a7bfc57fd73" FOREIGN KEY (busy_commissioning_id) REFERENCES public.grids(id);

ALTER TABLE ONLY public.audits
    ADD CONSTRAINT "FK_abde505f056e2f46c5df2c12491" FOREIGN KEY (organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.energy_cabins
    ADD CONSTRAINT "FK_ba81ffc1506025a549849f06f36" FOREIGN KEY (grid_id) REFERENCES public.grids(id);

ALTER TABLE ONLY public.metering_hardware_install_sessions
    ADD CONSTRAINT "FK_be64a09dc738420a409cb960264" FOREIGN KEY (last_metering_hardware_import_id) REFERENCES public.metering_hardware_imports(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.ussd_session_hops
    ADD CONSTRAINT "FK_bf89299bd6534528adad645b7a5" FOREIGN KEY (ussd_session_id) REFERENCES public.ussd_sessions(id);

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "FK_c1053eec8005016c7d9febdc484" FOREIGN KEY (grid_id) REFERENCES public.grids(id);

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "FK_cb7b1fb018b296f2107e998b2ff" FOREIGN KEY (organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.meters
    ADD CONSTRAINT "FK_d281c6e5f391b8de5b221032da6" FOREIGN KEY (connection_id) REFERENCES public.connections(id);

ALTER TABLE ONLY public.connection_requested_meters
    ADD CONSTRAINT "FK_d390197863e9a88be5e122d9695" FOREIGN KEY (connection_id) REFERENCES public.connections(id);

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT "FK_decaf331589778e33441b2a8d9e" FOREIGN KEY (account_id) REFERENCES public.accounts(id);

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT "FK_df520decc9e003a843d8edd9867" FOREIGN KEY (account_id) REFERENCES public.accounts(id);

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT "FK_e04c36c14bc9f01f84cd7655b68" FOREIGN KEY (customer_id) REFERENCES public.customers(id);

ALTER TABLE ONLY public.audits
    ADD CONSTRAINT "FK_e3f3409859562fbe10b78d1399e" FOREIGN KEY (member_id) REFERENCES public.members(id);

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT "FK_e63e504d8e35ef37a2c56b75eb9" FOREIGN KEY (connection_id) REFERENCES public.connections(id);

ALTER TABLE ONLY public.audits
    ADD CONSTRAINT "FK_eb582acfd9d83af268d328e0b79" FOREIGN KEY (dcu_id) REFERENCES public.dcus(id);

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT "FK_ebcc29963874e55053e8ee80be5" FOREIGN KEY (account_id) REFERENCES public.accounts(id);

ALTER TABLE ONLY public.ussd_sessions
    ADD CONSTRAINT "FK_ede50d58fa445bfa012135249fd" FOREIGN KEY (account_id) REFERENCES public.accounts(id);

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT "FK_f1a5ea7b77453030e2a1df27479" FOREIGN KEY (connection_id) REFERENCES public.connections(id);

ALTER TABLE ONLY public.metering_hardware_install_sessions
    ADD CONSTRAINT "FK_f3c53f4b922a011aa53d9e0b1ad" FOREIGN KEY (dcu_id) REFERENCES public.dcus(id);

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT "FK_f499c61c6d6a0ac3f794d966edc" FOREIGN KEY (organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT "FK_f5782e05e8688f0cfbb5c4a52ce" FOREIGN KEY (agent_id) REFERENCES public.agents(id);

ALTER TABLE ONLY public.members
    ADD CONSTRAINT "FK_fd9dfb97e21b75fc45d42aa614a" FOREIGN KEY (account_id) REFERENCES public.accounts(id);

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_rls_organization_id_fkey FOREIGN KEY (rls_organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.connection_requested_meters
    ADD CONSTRAINT connection_requested_meters_rls_organization_id_fkey FOREIGN KEY (rls_organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.connections
    ADD CONSTRAINT connections_rls_organization_id_fkey FOREIGN KEY (rls_organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_rls_organization_id_fkey FOREIGN KEY (rls_organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.dcus
    ADD CONSTRAINT dcus_rls_organization_id_fkey FOREIGN KEY (rls_organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.meter_command_batch_executions
    ADD CONSTRAINT meter_command_batch_executions_rls_organization_id_fkey FOREIGN KEY (rls_organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.meter_command_batches
    ADD CONSTRAINT meter_command_batches_rls_organization_id_fkey FOREIGN KEY (rls_organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.energy_cabins
    ADD CONSTRAINT energy_cabins_rls_organization_id_fkey FOREIGN KEY (rls_organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT issues_rls_organization_id_fkey FOREIGN KEY (rls_organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_rls_organization_id_fkey FOREIGN KEY (rls_organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.meter_commissionings
    ADD CONSTRAINT meter_commissionings_rls_organization_id_fkey FOREIGN KEY (rls_organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.meter_interactions
    ADD CONSTRAINT meter_interactions_batch_execution_id_fkey FOREIGN KEY (batch_execution_id) REFERENCES public.meter_command_batch_executions(id);

ALTER TABLE ONLY public.meter_interactions
    ADD CONSTRAINT meter_interactions_meter_commissioning_id_fkey FOREIGN KEY (meter_commissioning_id) REFERENCES public.meter_commissionings(id);

ALTER TABLE ONLY public.meter_interactions
    ADD CONSTRAINT meter_interactions_meter_id_fkey FOREIGN KEY (meter_id) REFERENCES public.meters(id);

ALTER TABLE ONLY public.meter_interactions
    ADD CONSTRAINT meter_interactions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);

ALTER TABLE ONLY public.metering_hardware_imports
    ADD CONSTRAINT metering_hardware_imports_rls_organization_id_fkey FOREIGN KEY (rls_organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.metering_hardware_install_sessions
    ADD CONSTRAINT metering_hardware_install_sessions_rls_organization_id_fkey FOREIGN KEY (rls_organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.meters
    ADD CONSTRAINT meters_rls_grid_id_fkey FOREIGN KEY (rls_grid_id) REFERENCES public.grids(id);

ALTER TABLE ONLY public.meters
    ADD CONSTRAINT meters_rls_organization_id_fkey FOREIGN KEY (rls_organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.mppts
    ADD CONSTRAINT mppts_rls_organization_id_fkey FOREIGN KEY (rls_organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_rls_organization_id_fkey FOREIGN KEY (rls_organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_rls_organization_id_fkey FOREIGN KEY (rls_organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.pd_site_submissions
    ADD CONSTRAINT pd_site_submissions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.pd_sites
    ADD CONSTRAINT pd_sites_operations_grid_id_fkey FOREIGN KEY (operations_grid_id) REFERENCES public.grids(id);

ALTER TABLE ONLY public.pd_sites
    ADD CONSTRAINT pd_sites_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.poles
    ADD CONSTRAINT poles_rls_organization_id_fkey FOREIGN KEY (rls_organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.routers
    ADD CONSTRAINT routers_rls_organization_id_fkey FOREIGN KEY (rls_organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_rls_organization_id_fkey FOREIGN KEY (rls_organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_rls_organization_id_fkey FOREIGN KEY (rls_organization_id) REFERENCES public.organizations(id);

-- =============================================================================
-- Indexes
-- =============================================================================
-- Existing kept indexes (renamed where their table was renamed), followed by
-- 49 new indexes: register #22 (partial unique on organizations), plus 48
-- FK/RLS-predicate coverage gaps from the schema audit (register #25, #30).

CREATE INDEX "IDX_14f6e0badc019bbdd2f66f7e8a" ON public.notifications USING btree (notification_status);

CREATE UNIQUE INDEX "IDX_36d092cd2d89756f62421011bb" ON public.meters USING btree (external_reference, external_system);

CREATE INDEX "IDX_5c820aa56824815f8e19484ff5" ON public.transactions USING btree (wallet_id, transaction_status, created_at);

CREATE UNIQUE INDEX "IDX_9c4f5693f52e6e5e51e1ca05af" ON public.dcus USING btree (external_reference, external_system);

CREATE INDEX idx_agents_rls_organization_id ON public.agents USING btree (rls_organization_id);

CREATE INDEX idx_connection_customer_id ON public.connections USING btree (customer_id);

CREATE INDEX idx_connection_requested_meters_rls_organization_id ON public.connection_requested_meters USING btree (rls_organization_id);

CREATE INDEX idx_connections_rls_organization_id ON public.connections USING btree (rls_organization_id);

CREATE INDEX idx_customer_grid_id ON public.customers USING btree (grid_id);

CREATE INDEX idx_customers_rls_organization_id ON public.customers USING btree (rls_organization_id);

CREATE INDEX idx_dcus_rls_organization_id ON public.dcus USING btree (rls_organization_id);

CREATE INDEX idx_meter_command_batch_executions_rls_organization_id ON public.meter_command_batch_executions USING btree (rls_organization_id);

CREATE INDEX idx_meter_command_batches_rls_organization_id ON public.meter_command_batches USING btree (rls_organization_id);

CREATE INDEX idx_energy_cabins_location_geom ON public.energy_cabins USING gist (location_geom);

CREATE INDEX idx_energy_cabins_rls_organization_id ON public.energy_cabins USING btree (rls_organization_id);

CREATE INDEX idx_issues_open ON public.issues USING btree (rls_organization_id, meter_id, created_at DESC) WHERE (issue_status = 'OPEN'::public.issue_status_enum);

CREATE INDEX idx_issues_rls_organization_id ON public.issues USING btree (rls_organization_id);

CREATE INDEX idx_members_rls_organization_id ON public.members USING btree (rls_organization_id);

CREATE INDEX idx_meter_commissionings_rls_organization_id ON public.meter_commissionings USING btree (rls_organization_id);

CREATE INDEX idx_meter_connection_id ON public.meters USING btree (connection_id);

CREATE INDEX idx_meter_dcu_id ON public.meters USING btree (dcu_id);

CREATE INDEX idx_meter_interaction_batch_execution_id ON public.meter_interactions USING btree (batch_execution_id, meter_interaction_status);

CREATE INDEX idx_meter_interaction_meter_commissioning_id ON public.meter_interactions USING btree (meter_commissioning_id);

CREATE INDEX idx_meter_interaction_meter_id_extra ON public.meter_interactions USING btree (meter_id, meter_interaction_type, created_at DESC);

CREATE INDEX idx_metering_hardware_install_sessions_rls_organization_id ON public.metering_hardware_install_sessions USING btree (rls_organization_id);

CREATE INDEX idx_meters_rls_organization_id ON public.meters USING btree (rls_organization_id);

CREATE INDEX idx_mppts_rls_organization_id ON public.mppts USING btree (rls_organization_id);

CREATE INDEX idx_notes_rls_organization_id ON public.notes USING btree (rls_organization_id);

CREATE INDEX idx_orders_energy_topup_grid ON public.orders USING btree (historical_grid_id) WHERE (meta_order_type = 'ENERGY_TOPUP'::public.order_type_enum);

CREATE INDEX idx_orders_energy_topup_receiver ON public.orders USING btree (meta_receiver_id) WHERE (meta_order_type = 'ENERGY_TOPUP'::public.order_type_enum);

CREATE INDEX idx_orders_historical_grid_id ON public.orders USING btree (historical_grid_id);

CREATE INDEX idx_orders_meta_receiver_id ON public.orders USING btree (meta_receiver_id);

CREATE INDEX idx_orders_order_optimized ON public.orders USING btree (updated_at DESC);

CREATE INDEX idx_orders_rls_organization_id ON public.orders USING btree (rls_organization_id);

CREATE INDEX idx_orders_rls_sender_receiver ON public.orders USING btree (meta_sender_type, meta_sender_id, meta_receiver_type, meta_receiver_id);

CREATE INDEX idx_pd_site_submissions_location_geom ON public.pd_site_submissions USING gist (location_geom);

CREATE INDEX idx_pd_site_submissions_outline_geom ON public.pd_site_submissions USING gist (outline_geom);

CREATE INDEX idx_pd_sites_location_geom ON public.pd_sites USING gist (location_geom);

CREATE INDEX idx_pd_sites_outline_geom ON public.pd_sites USING gist (outline_geom);

CREATE INDEX idx_poles_location_geom ON public.poles USING gist (location_geom);

CREATE INDEX idx_poles_rls_organization_id ON public.poles USING btree (rls_organization_id);

CREATE INDEX idx_routers_rls_organization_id ON public.routers USING btree (rls_organization_id);

CREATE INDEX idx_transactions_rls_organization_id ON public.transactions USING btree (rls_organization_id);

CREATE INDEX idx_wallets_rls_organization_id ON public.wallets USING btree (rls_organization_id);

-- New indexes (register #25, #30) — FK/RLS-predicate coverage gaps found while
-- auditing the legacy schema; not present in the legacy reference DB.

-- register #22 — at most one platform-operator organization (ADR-007 Amendment)
CREATE UNIQUE INDEX one_platform_operator_org ON public.organizations USING btree (organization_type) WHERE (organization_type = 'PLATFORM_OPERATOR'::public.organization_type_enum);

-- register #25 (Task 3c H1b)
CREATE INDEX idx_accounts_organization_id ON public.accounts USING btree (organization_id);

-- register #30 Tier 1 — RLS-predicate / renamed-FK gaps
CREATE INDEX idx_grids_organization_id ON public.grids USING btree (organization_id);
CREATE INDEX idx_metering_hardware_imports_rls_organization_id ON public.metering_hardware_imports USING btree (rls_organization_id);
CREATE INDEX idx_meter_command_batch_executions_meter_command_batch_id ON public.meter_command_batch_executions USING btree (meter_command_batch_id);

-- register #30 Tier 2 — plain FK-column hygiene (44 columns across 22 tables)
CREATE INDEX idx_agents_grid_id ON public.agents USING btree (grid_id);
CREATE INDEX idx_api_keys_account_id ON public.api_keys USING btree (account_id);
CREATE INDEX idx_audits_agent_id ON public.audits USING btree (agent_id);
CREATE INDEX idx_audits_author_id ON public.audits USING btree (author_id);
CREATE INDEX idx_audits_connection_id ON public.audits USING btree (connection_id);
CREATE INDEX idx_audits_customer_id ON public.audits USING btree (customer_id);
CREATE INDEX idx_audits_dcu_id ON public.audits USING btree (dcu_id);
CREATE INDEX idx_audits_grid_id ON public.audits USING btree (grid_id);
CREATE INDEX idx_audits_member_id ON public.audits USING btree (member_id);
CREATE INDEX idx_audits_meter_id ON public.audits USING btree (meter_id);
CREATE INDEX idx_audits_organization_id ON public.audits USING btree (organization_id);
CREATE INDEX idx_connection_requested_meters_connection_id ON public.connection_requested_meters USING btree (connection_id);
CREATE INDEX idx_dcus_grid_id ON public.dcus USING btree (grid_id);
CREATE INDEX idx_energy_cabins_grid_id ON public.energy_cabins USING btree (grid_id);
CREATE INDEX idx_meter_command_batches_author_id ON public.meter_command_batches USING btree (author_id);
CREATE INDEX idx_meter_command_batches_grid_id ON public.meter_command_batches USING btree (grid_id);
CREATE INDEX idx_meter_commissionings_metering_hardware_install_session_id ON public.meter_commissionings USING btree (metering_hardware_install_session_id);
CREATE INDEX idx_metering_hardware_imports_metering_hardware_install_session_id ON public.metering_hardware_imports USING btree (metering_hardware_install_session_id);
CREATE INDEX idx_metering_hardware_install_sessions_author_id ON public.metering_hardware_install_sessions USING btree (author_id);
CREATE INDEX idx_metering_hardware_install_sessions_dcu_id ON public.metering_hardware_install_sessions USING btree (dcu_id);
CREATE INDEX idx_metering_hardware_install_sessions_meter_id ON public.metering_hardware_install_sessions USING btree (meter_id);
CREATE INDEX idx_meters_pole_id ON public.meters USING btree (pole_id);
CREATE INDEX idx_mppts_grid_id ON public.mppts USING btree (grid_id);
CREATE INDEX idx_notes_author_id ON public.notes USING btree (author_id);
CREATE INDEX idx_notes_connection_id ON public.notes USING btree (connection_id);
CREATE INDEX idx_notes_customer_id ON public.notes USING btree (customer_id);
CREATE INDEX idx_notes_meter_id ON public.notes USING btree (meter_id);
CREATE INDEX idx_notifications_account_id ON public.notifications USING btree (account_id);
CREATE INDEX idx_notifications_grid_id ON public.notifications USING btree (grid_id);
CREATE INDEX idx_notifications_notification_parameter_id ON public.notifications USING btree (notification_parameter_id);
CREATE INDEX idx_notifications_organization_id ON public.notifications USING btree (organization_id);
CREATE INDEX idx_orders_author_id ON public.orders USING btree (author_id);
CREATE INDEX idx_orders_receiver_wallet_id ON public.orders USING btree (receiver_wallet_id);
CREATE INDEX idx_orders_sender_wallet_id ON public.orders USING btree (sender_wallet_id);
CREATE INDEX idx_pd_site_submissions_organization_id ON public.pd_site_submissions USING btree (organization_id);
CREATE INDEX idx_pd_sites_operations_grid_id ON public.pd_sites USING btree (operations_grid_id);
CREATE INDEX idx_pd_sites_organization_id ON public.pd_sites USING btree (organization_id);
CREATE INDEX idx_poles_grid_id ON public.poles USING btree (grid_id);
CREATE INDEX idx_routers_grid_id ON public.routers USING btree (grid_id);
CREATE INDEX idx_transactions_order_id ON public.transactions USING btree (order_id);
CREATE INDEX idx_ussd_session_hops_ussd_session_id ON public.ussd_session_hops USING btree (ussd_session_id);
CREATE INDEX idx_ussd_sessions_account_id ON public.ussd_sessions USING btree (account_id);
CREATE INDEX idx_ussd_sessions_bank_id ON public.ussd_sessions USING btree (bank_id);
CREATE INDEX idx_ussd_sessions_meter_id ON public.ussd_sessions USING btree (meter_id);

-- =============================================================================
-- Functions
-- =============================================================================
-- 25 keep functions: 17 carried over from the legacy chain (10 of them with
-- redesigned bodies per register #23), 2 renamed/redesigned (register #16,
-- #22), and 6 new RLS org-lookup leaf/delegate helpers (register #23).
-- Dropped: append_rls_organization_id_by_device_id,
-- append_rls_organization_id_by_receiver_meter_id,
-- append_rls_organization_id_by_historical_grid_id (register #12, #7, #21),
-- lock_next_order, lock_next_pd_action (register #13, #14),
-- notify_make_about_is_fs_on_updated, notify_make_about_is_hps_on_updated,
-- notify_make_about_kwh_tariff_essential_service_updated (register #6,
-- parameterized to the Make-integration operator recipe).

-- ---------------------------------------------------------------------------
-- RLS org-lookup helpers (register #23 §4) — leaf + delegates, STABLE
-- ---------------------------------------------------------------------------

CREATE FUNCTION public.rls_org_id_from_grid(grid_id integer) RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
    SELECT organization_id FROM public.grids WHERE id = grid_id;
$$;

CREATE FUNCTION public.rls_org_id_from_customer(customer_id integer) RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
    SELECT public.rls_org_id_from_grid(grid_id) FROM public.customers WHERE id = customer_id;
$$;

CREATE FUNCTION public.rls_org_id_from_connection(connection_id integer) RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
    SELECT public.rls_org_id_from_customer(customer_id) FROM public.connections WHERE id = connection_id;
$$;

CREATE FUNCTION public.rls_org_id_from_agent(agent_id integer) RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
    SELECT public.rls_org_id_from_grid(grid_id) FROM public.agents WHERE id = agent_id;
$$;

CREATE FUNCTION public.rls_org_id_from_meter(meter_id integer) RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
    SELECT public.rls_org_id_from_connection(connection_id) FROM public.meters WHERE id = meter_id;
$$;

CREATE FUNCTION public.rls_org_id_from_dcu(dcu_id integer) RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
    SELECT public.rls_org_id_from_grid(grid_id) FROM public.dcus WHERE id = dcu_id;
$$;

-- ---------------------------------------------------------------------------
-- append_rls_organization_id_by_* trigger functions (register #23 §4) —
-- redesigned to delegate to the helpers above; dead joins removed;
-- SET search_path TO '' added throughout
-- ---------------------------------------------------------------------------

CREATE FUNCTION public.append_rls_organization_id_by_account_id() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
	SELECT
		organization_id INTO NEW.rls_organization_id
	FROM
		public.accounts
	WHERE
		accounts.id = NEW.account_id;
	RETURN NEW;
END;
$$;

CREATE FUNCTION public.append_rls_organization_id_by_grid_id() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
	NEW.rls_organization_id := public.rls_org_id_from_grid(NEW.grid_id);
	RETURN NEW;
END;
$$;

CREATE FUNCTION public.append_rls_organization_id_by_connection_id() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
	NEW.rls_organization_id := public.rls_org_id_from_connection(NEW.connection_id);
	RETURN NEW;
END;
$$;

CREATE FUNCTION public.append_rls_organization_id_by_customer_id() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
	NEW.rls_organization_id := public.rls_org_id_from_customer(NEW.customer_id);
	RETURN NEW;
END;
$$;

CREATE FUNCTION public.append_rls_organization_id_by_customer_id_or_agent_id_or_connec() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
	IF NEW.customer_id IS NOT NULL THEN
		NEW.rls_organization_id := public.rls_org_id_from_customer(NEW.customer_id);
	ELSIF NEW.agent_id IS NOT NULL THEN
		NEW.rls_organization_id := public.rls_org_id_from_agent(NEW.agent_id);
	ELSIF NEW.connection_id IS NOT NULL THEN
		NEW.rls_organization_id := public.rls_org_id_from_connection(NEW.connection_id);
	ELSIF NEW.organization_id IS NOT NULL THEN
		NEW.rls_organization_id := NEW.organization_id;
	ELSIF NEW.meter_id IS NOT NULL THEN
		NEW.rls_organization_id := public.rls_org_id_from_meter(NEW.meter_id);
	END IF;
	RETURN NEW;
END;
$$;

CREATE FUNCTION public.append_rls_organization_id_by_dcu_id_or_meter_id() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
	IF NEW.dcu_id IS NOT NULL THEN
		NEW.rls_organization_id := public.rls_org_id_from_dcu(NEW.dcu_id);
	ELSIF NEW.meter_id IS NOT NULL THEN
		NEW.rls_organization_id := public.rls_org_id_from_meter(NEW.meter_id);
	END IF;
	RETURN NEW;
END;
$$;

CREATE FUNCTION public.append_rls_organization_id_by_meter_id() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
	NEW.rls_organization_id := public.rls_org_id_from_meter(NEW.meter_id);
	RETURN NEW;
END;
$$;

CREATE FUNCTION public.append_rls_organization_id_by_metering_hardware_install_session() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
	session_meter_id integer;
BEGIN
	SELECT
		meter_id INTO session_meter_id
	FROM
		public.metering_hardware_install_sessions
	WHERE
		id = NEW.metering_hardware_install_session_id;
	NEW.rls_organization_id := public.rls_org_id_from_meter(session_meter_id);
	RETURN NEW;
END;
$$;

CREATE FUNCTION public.append_rls_organization_id_by_order_id() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
	order_grid_id integer;
BEGIN
	SELECT
		historical_grid_id INTO order_grid_id
	FROM
		public.orders
	WHERE
		id = NEW.order_id;
	NEW.rls_organization_id := public.rls_org_id_from_grid(order_grid_id);
	RETURN NEW;
END;
$$;

-- Renamed from append_rls_organization_id_by_directive_batch_id() (register #16); body redesigned (register #23)
CREATE FUNCTION public.append_rls_organization_id_by_meter_command_batch_id() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
	batch_grid_id integer;
BEGIN
	SELECT
		grid_id INTO batch_grid_id
	FROM
		public.meter_command_batches
	WHERE
		id = NEW.meter_command_batch_id;
	NEW.rls_organization_id := public.rls_org_id_from_grid(batch_grid_id);
	RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Admin-organization membership check (register #22) — renamed from
-- rls_check_if_nxt_member(); reads PLATFORM_OPERATOR row directly (indexed
-- via one_platform_operator_org). GUC + ALTER DATABASE dropped: Supabase
-- migrations run as non-superuser postgres and cannot set custom DB params.
-- ---------------------------------------------------------------------------

CREATE FUNCTION public.rls_check_if_admin_org_member() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
    SELECT (auth.jwt () -> 'app_metadata' ->> 'account_type') = 'MEMBER'
        AND (auth.jwt () -> 'app_metadata' ->> 'organization_id')::int = (
            SELECT
                o.id
            FROM
                public.organizations AS o
            WHERE
                o.organization_type = 'PLATFORM_OPERATOR'
            ORDER BY
                o.id
            LIMIT 1);
$$;

-- ---------------------------------------------------------------------------
-- Remaining RLS helpers — mark STABLE only (register #31), logic unchanged
-- ---------------------------------------------------------------------------

CREATE FUNCTION public.rls_check_if_lender() RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
	RETURN (auth.jwt () -> 'app_metadata' ->> 'organization_type')::text = 'LENDER';
END;
$$;

CREATE FUNCTION public.rls_get_member_org_id() RETURNS integer
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
	RETURN (auth.jwt () -> 'app_metadata' ->> 'organization_id')::int;
END;
$$;

-- ---------------------------------------------------------------------------
-- auth.users trigger functions (H2 keep, unchanged)
-- ---------------------------------------------------------------------------

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
	-- RAISE LOG 'New user: %', NEW;
	-- Every Supabase User gets an Account that holds more metadata
	-- We don't have access to raw_app_meta_data here but we do in
	-- the subsequent update trigger
	INSERT INTO public.accounts (supabase_id, email, phone, full_name, telegram_link_token)
		VALUES(NEW.id, NEW.email, NEW.phone, NEW.raw_user_meta_data ->> 'full_name', gen_random_uuid ());
	RETURN NEW;
END;
$$;

CREATE FUNCTION public.handle_update_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
	UPDATE
		public.accounts
	SET
		email = NEW.email,
		phone = NEW.phone,
		full_name = NEW.raw_user_meta_data ->> 'full_name',
		organization_id = CAST(COALESCE(NEW.raw_app_meta_data ->> 'organization_id', NULL) AS integer)
	WHERE
		supabase_id = NEW.id;
	RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Payments / production-monitoring RPCs
-- ---------------------------------------------------------------------------

-- register #24: SET search_path TO '' added; logic unchanged
CREATE FUNCTION public.lock_next_order_and_wallets(uuid uuid) RETURNS TABLE(id integer)
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
  order_id_var integer;
  sender_wallet_id_var integer;
  receiver_wallet_id_var integer;
BEGIN
  -- 1. Atomic Selection
  SELECT
    _orders.id,
    _orders.sender_wallet_id,
    _orders.receiver_wallet_id
  INTO
    order_id_var,
    sender_wallet_id_var,
    receiver_wallet_id_var
  FROM
    public.orders _orders
  JOIN public.wallets AS sender_wallets ON sender_wallets.id = _orders.sender_wallet_id
  JOIN public.wallets AS receiver_wallets ON receiver_wallets.id = _orders.receiver_wallet_id
  WHERE
    _orders.order_status = 'PENDING'
    AND sender_wallets.lock_session IS NULL
    AND receiver_wallets.lock_session IS NULL
  ORDER BY
    _orders.id ASC
  LIMIT 1
  FOR UPDATE OF _orders, sender_wallets, receiver_wallets SKIP LOCKED;

  -- 2. Early exit if no order matches
  IF order_id_var IS NULL THEN
    RETURN;
  END IF;

  -- 3. Update the Order
  -- explicit alias 'order_record' prevents confusion with any variables
  UPDATE
    public.orders AS order_record
  SET
    lock_session = uuid
  WHERE
    order_record.id = order_id_var;

  -- 4. Update the Wallets and Return their IDs
  -- explicit alias 'wallet_record' prevents confusion
  RETURN QUERY
  UPDATE
    public.wallets AS wallet_record
  SET
    lock_session = uuid
  WHERE
    wallet_record.id IN (sender_wallet_id_var, receiver_wallet_id_var)
  RETURNING
    wallet_record.id;
END;
$$;

-- register #27: mark STABLE; logic unchanged
CREATE FUNCTION public.find_energy_topup_revenue(grid_id integer, start_date timestamp with time zone, end_date timestamp with time zone) RETURNS numeric
    LANGUAGE plpgsql STABLE
    SET search_path TO ''
    AS $$
DECLARE
	total_revenue NUMERIC;
BEGIN
	SELECT
		SUM(amount) INTO total_revenue
	FROM
		public.orders
	WHERE
		meta_order_type = 'ENERGY_TOPUP'::public.order_type_enum
		AND order_status = 'COMPLETED'::public.order_status_enum
		AND meta_is_hidden_from_reporting = FALSE
		AND historical_grid_id = grid_id
		AND created_at >= start_date
		AND created_at < end_date;
	RETURN total_revenue;
END;
$$;

-- register #27: mark STABLE; GROUP BY meta_receiver_id dropped (customer-level
-- top-spender aggregation; the legacy meter id in GROUP BY split one customer
-- across rows) — return shape unchanged
CREATE FUNCTION public.find_top_spenders(grid_id integer, limit_count integer, start_date timestamp with time zone, end_date timestamp with time zone) RETURNS TABLE(full_name character varying, id integer, amount double precision)
    LANGUAGE plpgsql STABLE
    SET search_path TO ''
    AS $$
BEGIN
	RETURN QUERY
	SELECT
		meta_receiver_name_part_2 AS full_name,
		meta_receiver_id_part_2 AS id,
		SUM(
			_orders.amount
) AS amount
	FROM
		public.orders AS _orders
	WHERE
		meta_order_type = 'ENERGY_TOPUP'::public.order_type_enum
		AND order_status = 'COMPLETED'::public.order_status_enum
		AND meta_is_hidden_from_reporting = FALSE
		AND historical_grid_id = grid_id
		AND created_at >= start_date
		AND created_at < end_date
	GROUP BY
		meta_receiver_id_part_2,
		meta_receiver_name_part_2
	ORDER BY
		SUM(
			_orders.amount
) DESC
	LIMIT limit_count;
END;
$$;

-- register #26: are_all_dcus_online / are_all_dcus_under_high_load_threshold
-- dropped from RETURNS TABLE and SELECT body (grids columns dropped, register
-- #17); mark STABLE. Pegasus gateway alerts use dcus.is_online instead.
CREATE FUNCTION public.get_grid_status(grid_id integer) RETURNS TABLE(is_hps_on boolean, is_fs_on boolean, is_cabin_meter_credit_depleting boolean, customer_count integer)
    LANGUAGE plpgsql STABLE
    SET search_path TO ''
    AS $$BEGIN
	RETURN QUERY
	SELECT
		_grid.is_hps_on,
		_grid.is_fs_on,
		_grid.is_cabin_meter_credit_depleting,
		(
			SELECT
				COUNT(DISTINCT _customer.id)::integer
			FROM
				public.customers _customer
				JOIN public.accounts _account ON _account.id = _customer.account_id
				JOIN public.connections _connection ON _connection.customer_id = _customer.id
				JOIN public.meters _meter ON _meter.connection_id = _connection.id
			WHERE
				_customer.grid_id = _grid.id
				AND _customer.is_hidden_from_reporting = FALSE
				AND _account.deleted_at IS NULL) AS customer_count
		FROM
			public.grids _grid
		WHERE
			_grid.id = grid_id;
END;$$;

-- =============================================================================
-- Triggers
-- =============================================================================
-- 21 triggers: 19 append_rls_organization_id_* triggers backing denormalized
-- RLS columns (3 renamed alongside their table, register #16) and the 2
-- auth.users triggers carried over from the legacy chain unchanged.

CREATE TRIGGER append_rls_organization_id_on_agent_insert BEFORE INSERT ON public.agents FOR EACH ROW EXECUTE FUNCTION public.append_rls_organization_id_by_grid_id();

CREATE TRIGGER append_rls_organization_id_on_connection_insert BEFORE INSERT ON public.connections FOR EACH ROW EXECUTE FUNCTION public.append_rls_organization_id_by_customer_id();

CREATE TRIGGER append_rls_organization_id_on_customer_insert BEFORE INSERT ON public.customers FOR EACH ROW EXECUTE FUNCTION public.append_rls_organization_id_by_grid_id();

CREATE TRIGGER append_rls_organization_id_on_dcus_insert BEFORE INSERT ON public.dcus FOR EACH ROW EXECUTE FUNCTION public.append_rls_organization_id_by_grid_id();

CREATE TRIGGER append_rls_organization_id_on_meter_command_batch_execution_insert BEFORE INSERT ON public.meter_command_batch_executions FOR EACH ROW EXECUTE FUNCTION public.append_rls_organization_id_by_meter_command_batch_id();

CREATE TRIGGER append_rls_organization_id_on_meter_command_batch_insert BEFORE INSERT ON public.meter_command_batches FOR EACH ROW EXECUTE FUNCTION public.append_rls_organization_id_by_grid_id();

CREATE TRIGGER append_rls_organization_id_on_energy_cabin_insert BEFORE INSERT ON public.energy_cabins FOR EACH ROW EXECUTE FUNCTION public.append_rls_organization_id_by_grid_id();

CREATE TRIGGER append_rls_organization_id_on_issue_insert BEFORE INSERT ON public.issues FOR EACH ROW EXECUTE FUNCTION public.append_rls_organization_id_by_meter_id();

CREATE TRIGGER append_rls_organization_id_on_member_insert BEFORE INSERT ON public.members FOR EACH ROW EXECUTE FUNCTION public.append_rls_organization_id_by_account_id();

CREATE TRIGGER append_rls_organization_id_on_meter_commissioning_insert BEFORE INSERT ON public.meter_commissionings FOR EACH ROW EXECUTE FUNCTION public.append_rls_organization_id_by_metering_hardware_install_session();

CREATE TRIGGER append_rls_organization_id_on_meter_insert BEFORE INSERT ON public.meters FOR EACH ROW EXECUTE FUNCTION public.append_rls_organization_id_by_connection_id();

CREATE TRIGGER append_rls_organization_id_on_meter_install_session_insert BEFORE INSERT ON public.metering_hardware_install_sessions FOR EACH ROW EXECUTE FUNCTION public.append_rls_organization_id_by_dcu_id_or_meter_id();

CREATE TRIGGER append_rls_organization_id_on_mppt_insert BEFORE INSERT ON public.mppts FOR EACH ROW EXECUTE FUNCTION public.append_rls_organization_id_by_grid_id();

CREATE TRIGGER append_rls_organization_id_on_note_insert BEFORE INSERT ON public.notes FOR EACH ROW EXECUTE FUNCTION public.append_rls_organization_id_by_customer_id();

CREATE TRIGGER append_rls_organization_id_on_pole_insert BEFORE INSERT ON public.poles FOR EACH ROW EXECUTE FUNCTION public.append_rls_organization_id_by_grid_id();

CREATE TRIGGER append_rls_organization_id_on_requested_connection_meters_inser BEFORE INSERT ON public.connection_requested_meters FOR EACH ROW EXECUTE FUNCTION public.append_rls_organization_id_by_connection_id();

CREATE TRIGGER append_rls_organization_id_on_router_insert BEFORE INSERT ON public.routers FOR EACH ROW EXECUTE FUNCTION public.append_rls_organization_id_by_grid_id();

CREATE TRIGGER append_rls_organization_id_on_transaction_insert BEFORE INSERT ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.append_rls_organization_id_by_order_id();

CREATE TRIGGER append_rls_organization_id_on_wallet_insert BEFORE INSERT ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.append_rls_organization_id_by_customer_id_or_agent_id_or_connec();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_updated AFTER UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_update_user();

-- =============================================================================
-- Row-level security
-- =============================================================================
-- RLS is enabled on all 35 kept tables (unchanged from the legacy chain).
-- 76 of the legacy chain's 123 policies are kept — 26 dropped with their
-- table, 21 dropped for targeting company-infra readonly roles
-- (grafana_readonly, make_readonly, snaplet_readonly_2) that this baseline
-- does not provision. 18 policies are rewritten to wrap their RLS helper
-- call in `( SELECT … )` for per-statement (not per-row) evaluation (register
-- #32) — the other 51 helper-calling policies were already wrapped upstream.

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connection_requested_meters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dcus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meter_command_batch_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meter_command_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.energy_cabins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meter_commissionings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meter_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metering_hardware_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metering_hardware_install_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mppts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pd_site_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pd_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solcast_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ussd_session_hops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ussd_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow NXT Grid to CRUD" ON public.connections TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to insert" ON public.grids FOR INSERT TO authenticated WITH CHECK (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to insert" ON public.meters FOR INSERT TO authenticated WITH CHECK (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to insert" ON public.notes FOR INSERT TO authenticated WITH CHECK (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to insert" ON public.organizations FOR INSERT TO authenticated WITH CHECK (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to insert" ON public.pd_sites FOR INSERT TO authenticated WITH CHECK (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to insert" ON public.poles FOR INSERT TO authenticated WITH CHECK (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to insert" ON public.wallets FOR INSERT WITH CHECK (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to select" ON public.accounts FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to select" ON public.agents FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to select" ON public.connection_requested_meters FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to select" ON public.connections FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to select" ON public.customers FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to select" ON public.dcus FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to select" ON public.meter_command_batch_executions FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to select" ON public.meter_command_batches FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to select" ON public.energy_cabins FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to select" ON public.grids FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to select" ON public.issues FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to select" ON public.members FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to select" ON public.meter_commissionings FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to select" ON public.meter_interactions FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to select" ON public.metering_hardware_install_sessions FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to select" ON public.meters FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to select" ON public.mppts FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to select" ON public.notes FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to select" ON public.orders FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to select" ON public.organizations FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to select" ON public.pd_sites FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to select" ON public.poles FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to select" ON public.routers FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to select" ON public.transactions FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to select" ON public.wallets FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to update" ON public.accounts FOR UPDATE TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to update" ON public.connections FOR UPDATE TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to update" ON public.grids FOR UPDATE TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to update" ON public.meters FOR UPDATE TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to update" ON public.organizations FOR UPDATE TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to update" ON public.pd_site_submissions FOR UPDATE TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to update" ON public.pd_sites FOR UPDATE TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow authenticated to do everything" ON public.audits USING (true);

CREATE POLICY "Allow authenticated to select" ON public.metering_hardware_imports FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authors to update their own" ON public.notes FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = ( SELECT account.supabase_id
   FROM public.accounts account
  WHERE (account.id = notes.author_id))));

CREATE POLICY "Allow lenders to select" ON public.accounts FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_lender() AS rls_check_if_lender));

CREATE POLICY "Allow lenders to select" ON public.customers FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_lender() AS rls_check_if_lender));

CREATE POLICY "Allow lenders to select" ON public.grids FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_lender() AS rls_check_if_lender));

CREATE POLICY "Allow lenders to select" ON public.orders FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_lender() AS rls_check_if_lender));

CREATE POLICY "Allow org member to select" ON public.accounts FOR SELECT TO authenticated USING ((( SELECT public.rls_get_member_org_id() AS rls_get_member_org_id) = organization_id));

CREATE POLICY "Allow org members to insert" ON public.notes FOR INSERT TO authenticated WITH CHECK (( SELECT (public.rls_get_member_org_id() = rls_organization_id) AS rls_get_member_org_id));

CREATE POLICY "Allow org members to insert" ON public.poles FOR INSERT WITH CHECK (( SELECT (public.rls_get_member_org_id() = rls_organization_id) AS rls_get_member_org_id));

CREATE POLICY "Allow org members to select" ON public.agents FOR SELECT TO authenticated USING ((( SELECT public.rls_get_member_org_id() AS rls_get_member_org_id) = rls_organization_id));

CREATE POLICY "Allow org members to select" ON public.connection_requested_meters FOR SELECT TO authenticated USING ((( SELECT public.rls_get_member_org_id() AS rls_get_member_org_id) = rls_organization_id));

CREATE POLICY "Allow org members to select" ON public.connections FOR SELECT TO authenticated USING ((( SELECT public.rls_get_member_org_id() AS rls_get_member_org_id) = rls_organization_id));

CREATE POLICY "Allow org members to select" ON public.customers FOR SELECT TO authenticated USING ((( SELECT public.rls_get_member_org_id() AS rls_get_member_org_id) = rls_organization_id));

CREATE POLICY "Allow org members to select" ON public.dcus FOR SELECT TO authenticated USING ((( SELECT public.rls_get_member_org_id() AS rls_get_member_org_id) = rls_organization_id));

CREATE POLICY "Allow org members to select" ON public.meter_command_batches FOR SELECT TO authenticated USING ((( SELECT public.rls_get_member_org_id() AS rls_get_member_org_id) = rls_organization_id));

CREATE POLICY "Allow org members to select" ON public.energy_cabins FOR SELECT TO authenticated USING ((( SELECT public.rls_get_member_org_id() AS rls_get_member_org_id) = rls_organization_id));

CREATE POLICY "Allow org members to select" ON public.grids FOR SELECT TO authenticated USING ((( SELECT public.rls_get_member_org_id() AS rls_get_member_org_id) = organization_id));

CREATE POLICY "Allow org members to select" ON public.issues FOR SELECT TO authenticated USING ((( SELECT public.rls_get_member_org_id() AS rls_get_member_org_id) = rls_organization_id));

CREATE POLICY "Allow org members to select" ON public.members FOR SELECT TO authenticated USING ((( SELECT public.rls_get_member_org_id() AS rls_get_member_org_id) = rls_organization_id));

CREATE POLICY "Allow org members to select" ON public.meter_commissionings FOR SELECT TO authenticated USING ((( SELECT public.rls_get_member_org_id() AS rls_get_member_org_id) = rls_organization_id));

CREATE POLICY "Allow org members to select" ON public.meter_interactions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow org members to select" ON public.metering_hardware_install_sessions FOR SELECT TO authenticated USING ((( SELECT public.rls_get_member_org_id() AS rls_get_member_org_id) = rls_organization_id));

CREATE POLICY "Allow org members to select" ON public.mppts FOR SELECT TO authenticated USING ((( SELECT public.rls_get_member_org_id() AS rls_get_member_org_id) = rls_organization_id));

CREATE POLICY "Allow org members to select" ON public.notes FOR SELECT TO authenticated USING ((( SELECT public.rls_get_member_org_id() AS rls_get_member_org_id) = rls_organization_id));

CREATE POLICY "Allow org members to select" ON public.orders FOR SELECT TO authenticated USING ((( SELECT public.rls_get_member_org_id() AS rls_get_member_org_id) = rls_organization_id));

CREATE POLICY "Allow org members to select" ON public.organizations FOR SELECT TO authenticated USING ((( SELECT public.rls_get_member_org_id() AS rls_get_member_org_id) = id));

CREATE POLICY "Allow org members to select" ON public.poles FOR SELECT TO authenticated USING ((( SELECT public.rls_get_member_org_id() AS rls_get_member_org_id) = rls_organization_id));

CREATE POLICY "Allow org members to select" ON public.routers FOR SELECT TO authenticated USING ((( SELECT public.rls_get_member_org_id() AS rls_get_member_org_id) = rls_organization_id));

CREATE POLICY "Allow org members to select" ON public.transactions FOR SELECT TO authenticated USING ((( SELECT public.rls_get_member_org_id() AS rls_get_member_org_id) = rls_organization_id));

CREATE POLICY "Allow org members to select (TEMPORARILY OPEN)" ON public.wallets FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow org members to select own and UNASSIGNED" ON public.meters FOR SELECT TO authenticated USING (((rls_organization_id IS NULL) OR (( SELECT public.rls_get_member_org_id() AS rls_get_member_org_id) = rls_organization_id)));

CREATE POLICY "Allow org members to update" ON public.accounts FOR UPDATE TO authenticated USING (( SELECT (public.rls_get_member_org_id() = organization_id) AS rls_get_member_org_id));

CREATE POLICY "Allow org members to update" ON public.orders FOR UPDATE TO authenticated USING (( SELECT (public.rls_get_member_org_id() = rls_organization_id) AS rls_get_member_org_id));

CREATE POLICY "Allow public selects (temporary for sending response to MAKE)" ON public.pd_site_submissions FOR SELECT USING (true);

CREATE POLICY "Allow public writes (Sites can be submitted publicly)" ON public.pd_site_submissions FOR INSERT WITH CHECK (true);

-- =============================================================================
-- Grants (Data API access)
-- =============================================================================
-- Explicit per-object GRANTs for every kept table, sequence, and function, to
-- anon/authenticated/service_role (register #33) — required for Data API
-- (PostgREST/GraphQL) reachability; Supabase stopped auto-granting these on
-- new projects from 2026-05-30. The corresponding 3 ALTER DEFAULT PRIVILEGES
-- statements are deliberately omitted: future tables get explicit grants per
-- migration instead of an ambient auto-expose default.

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.accounts TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.accounts TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.accounts TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.agents TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.agents TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.agents TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.agents_with_account TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.agents_with_account TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.agents_with_account TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.api_keys TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.api_keys TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.api_keys TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.audits TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.audits TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.audits TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.banks TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.banks TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.banks TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.dcus TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.dcus TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.dcus TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.meters TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.meters TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.meters TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.poles TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.poles TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.poles TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.connection_requested_meters TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.connection_requested_meters TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.connection_requested_meters TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.connections TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.connections TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.connections TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.customers TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.customers TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.customers TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.customers_with_account TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.customers_with_account TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.customers_with_account TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.meter_command_batch_executions TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.meter_command_batch_executions TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.meter_command_batch_executions TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.meter_command_batches TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.meter_command_batches TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.meter_command_batches TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.energy_cabins TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.energy_cabins TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.energy_cabins TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.grids TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.grids TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.grids TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.issues TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.issues TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.issues TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.members TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.members TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.members TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.meter_commissionings TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.meter_commissionings TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.meter_commissionings TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.meter_interactions TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.meter_interactions TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.meter_interactions TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.metering_hardware_imports TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.metering_hardware_imports TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.metering_hardware_imports TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.metering_hardware_install_sessions TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.metering_hardware_install_sessions TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.metering_hardware_install_sessions TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.meters_with_account_and_statuses TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.meters_with_account_and_statuses TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.meters_with_account_and_statuses TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.mppts TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.mppts TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.mppts TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.notes TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.notes TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.notes TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.notification_parameters TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.notification_parameters TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.notification_parameters TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.notifications TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.notifications TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.notifications TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.orders TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.orders TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.orders TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.organizations TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.organizations TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.organizations TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.pd_site_submissions TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.pd_site_submissions TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.pd_site_submissions TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.pd_sites TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.pd_sites TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.pd_sites TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.routers TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.routers TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.routers TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.solcast_cache TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.solcast_cache TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.solcast_cache TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.transactions TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.transactions TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.transactions TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.ussd_session_hops TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.ussd_session_hops TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.ussd_session_hops TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.ussd_sessions TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.ussd_sessions TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.ussd_sessions TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.wallets TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.wallets TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.wallets TO service_role;

GRANT ALL ON SEQUENCE public.accounts_id_seq TO anon;
GRANT ALL ON SEQUENCE public.accounts_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.accounts_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.agents_id_seq TO anon;
GRANT ALL ON SEQUENCE public.agents_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.agents_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.api_keys_id_seq TO anon;
GRANT ALL ON SEQUENCE public.api_keys_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.api_keys_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.audits_id_seq TO anon;
GRANT ALL ON SEQUENCE public.audits_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.audits_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.banks_id_seq TO anon;
GRANT ALL ON SEQUENCE public.banks_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.banks_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.connection_requested_meters_id_seq TO anon;
GRANT ALL ON SEQUENCE public.connection_requested_meters_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.connection_requested_meters_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.connections_id_seq TO anon;
GRANT ALL ON SEQUENCE public.connections_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.connections_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.customers_id_seq TO anon;
GRANT ALL ON SEQUENCE public.customers_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.customers_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.dcus_id_seq TO anon;
GRANT ALL ON SEQUENCE public.dcus_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.dcus_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.meter_command_batch_executions_id_seq TO anon;
GRANT ALL ON SEQUENCE public.meter_command_batch_executions_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.meter_command_batch_executions_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.meter_command_batches_id_seq TO anon;
GRANT ALL ON SEQUENCE public.meter_command_batches_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.meter_command_batches_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.energy_cabins_id_seq TO anon;
GRANT ALL ON SEQUENCE public.energy_cabins_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.energy_cabins_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.grids_id_seq TO anon;
GRANT ALL ON SEQUENCE public.grids_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.grids_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.issues_id_seq TO anon;
GRANT ALL ON SEQUENCE public.issues_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.issues_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.members_id_seq TO anon;
GRANT ALL ON SEQUENCE public.members_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.members_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.meter_commissionings_id_seq TO anon;
GRANT ALL ON SEQUENCE public.meter_commissionings_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.meter_commissionings_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.meter_interactions_id_seq TO anon;
GRANT ALL ON SEQUENCE public.meter_interactions_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.meter_interactions_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.metering_hardware_imports_id_seq TO anon;
GRANT ALL ON SEQUENCE public.metering_hardware_imports_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.metering_hardware_imports_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.metering_hardware_install_sessions_id_seq TO anon;
GRANT ALL ON SEQUENCE public.metering_hardware_install_sessions_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.metering_hardware_install_sessions_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.meters_id_seq TO anon;
GRANT ALL ON SEQUENCE public.meters_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.meters_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.mppts_id_seq TO anon;
GRANT ALL ON SEQUENCE public.mppts_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.mppts_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.notes_id_seq TO anon;
GRANT ALL ON SEQUENCE public.notes_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.notes_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.notification_parameters_id_seq TO anon;
GRANT ALL ON SEQUENCE public.notification_parameters_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.notification_parameters_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.notifications_id_seq TO anon;
GRANT ALL ON SEQUENCE public.notifications_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.notifications_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.orders_id_seq TO anon;
GRANT ALL ON SEQUENCE public.orders_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.orders_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.organizations_id_seq TO anon;
GRANT ALL ON SEQUENCE public.organizations_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.organizations_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.pd_site_submissions_id_seq TO anon;
GRANT ALL ON SEQUENCE public.pd_site_submissions_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.pd_site_submissions_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.pd_sites_id_seq TO anon;
GRANT ALL ON SEQUENCE public.pd_sites_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.pd_sites_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.poles_id_seq TO anon;
GRANT ALL ON SEQUENCE public.poles_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.poles_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.routers_id_seq TO anon;
GRANT ALL ON SEQUENCE public.routers_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.routers_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.solcast_cache_id_seq TO anon;
GRANT ALL ON SEQUENCE public.solcast_cache_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.solcast_cache_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.transactions_id_seq TO anon;
GRANT ALL ON SEQUENCE public.transactions_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.transactions_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.ussd_session_hops_id_seq TO anon;
GRANT ALL ON SEQUENCE public.ussd_session_hops_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.ussd_session_hops_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.ussd_sessions_id_seq TO anon;
GRANT ALL ON SEQUENCE public.ussd_sessions_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.ussd_sessions_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.wallets_id_seq TO anon;
GRANT ALL ON SEQUENCE public.wallets_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.wallets_id_seq TO service_role;

GRANT ALL ON FUNCTION public.append_rls_organization_id_by_account_id() TO anon;
GRANT ALL ON FUNCTION public.append_rls_organization_id_by_account_id() TO authenticated;
GRANT ALL ON FUNCTION public.append_rls_organization_id_by_account_id() TO service_role;

GRANT ALL ON FUNCTION public.append_rls_organization_id_by_connection_id() TO anon;
GRANT ALL ON FUNCTION public.append_rls_organization_id_by_connection_id() TO authenticated;
GRANT ALL ON FUNCTION public.append_rls_organization_id_by_connection_id() TO service_role;

GRANT ALL ON FUNCTION public.append_rls_organization_id_by_customer_id() TO anon;
GRANT ALL ON FUNCTION public.append_rls_organization_id_by_customer_id() TO authenticated;
GRANT ALL ON FUNCTION public.append_rls_organization_id_by_customer_id() TO service_role;

GRANT ALL ON FUNCTION public.append_rls_organization_id_by_customer_id_or_agent_id_or_connec() TO anon;
GRANT ALL ON FUNCTION public.append_rls_organization_id_by_customer_id_or_agent_id_or_connec() TO authenticated;
GRANT ALL ON FUNCTION public.append_rls_organization_id_by_customer_id_or_agent_id_or_connec() TO service_role;

GRANT ALL ON FUNCTION public.append_rls_organization_id_by_dcu_id_or_meter_id() TO anon;
GRANT ALL ON FUNCTION public.append_rls_organization_id_by_dcu_id_or_meter_id() TO authenticated;
GRANT ALL ON FUNCTION public.append_rls_organization_id_by_dcu_id_or_meter_id() TO service_role;

GRANT ALL ON FUNCTION public.append_rls_organization_id_by_meter_command_batch_id() TO anon;
GRANT ALL ON FUNCTION public.append_rls_organization_id_by_meter_command_batch_id() TO authenticated;
GRANT ALL ON FUNCTION public.append_rls_organization_id_by_meter_command_batch_id() TO service_role;

GRANT ALL ON FUNCTION public.append_rls_organization_id_by_grid_id() TO anon;
GRANT ALL ON FUNCTION public.append_rls_organization_id_by_grid_id() TO authenticated;
GRANT ALL ON FUNCTION public.append_rls_organization_id_by_grid_id() TO service_role;

GRANT ALL ON FUNCTION public.append_rls_organization_id_by_meter_id() TO anon;
GRANT ALL ON FUNCTION public.append_rls_organization_id_by_meter_id() TO authenticated;
GRANT ALL ON FUNCTION public.append_rls_organization_id_by_meter_id() TO service_role;

GRANT ALL ON FUNCTION public.append_rls_organization_id_by_metering_hardware_install_session() TO anon;
GRANT ALL ON FUNCTION public.append_rls_organization_id_by_metering_hardware_install_session() TO authenticated;
GRANT ALL ON FUNCTION public.append_rls_organization_id_by_metering_hardware_install_session() TO service_role;

GRANT ALL ON FUNCTION public.append_rls_organization_id_by_order_id() TO anon;
GRANT ALL ON FUNCTION public.append_rls_organization_id_by_order_id() TO authenticated;
GRANT ALL ON FUNCTION public.append_rls_organization_id_by_order_id() TO service_role;

GRANT ALL ON FUNCTION public.find_energy_topup_revenue(grid_id integer, start_date timestamp with time zone, end_date timestamp with time zone) TO anon;
GRANT ALL ON FUNCTION public.find_energy_topup_revenue(grid_id integer, start_date timestamp with time zone, end_date timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION public.find_energy_topup_revenue(grid_id integer, start_date timestamp with time zone, end_date timestamp with time zone) TO service_role;

GRANT ALL ON FUNCTION public.find_top_spenders(grid_id integer, limit_count integer, start_date timestamp with time zone, end_date timestamp with time zone) TO anon;
GRANT ALL ON FUNCTION public.find_top_spenders(grid_id integer, limit_count integer, start_date timestamp with time zone, end_date timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION public.find_top_spenders(grid_id integer, limit_count integer, start_date timestamp with time zone, end_date timestamp with time zone) TO service_role;

GRANT ALL ON FUNCTION public.get_grid_status(grid_id integer) TO anon;
GRANT ALL ON FUNCTION public.get_grid_status(grid_id integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_grid_status(grid_id integer) TO service_role;

GRANT ALL ON FUNCTION public.handle_new_user() TO anon;
GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;

GRANT ALL ON FUNCTION public.handle_update_user() TO anon;
GRANT ALL ON FUNCTION public.handle_update_user() TO authenticated;
GRANT ALL ON FUNCTION public.handle_update_user() TO service_role;

GRANT ALL ON FUNCTION public.lock_next_order_and_wallets(uuid uuid) TO anon;
GRANT ALL ON FUNCTION public.lock_next_order_and_wallets(uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.lock_next_order_and_wallets(uuid uuid) TO service_role;

GRANT ALL ON FUNCTION public.rls_check_if_lender() TO anon;
GRANT ALL ON FUNCTION public.rls_check_if_lender() TO authenticated;
GRANT ALL ON FUNCTION public.rls_check_if_lender() TO service_role;

GRANT ALL ON FUNCTION public.rls_check_if_admin_org_member() TO anon;
GRANT ALL ON FUNCTION public.rls_check_if_admin_org_member() TO authenticated;
GRANT ALL ON FUNCTION public.rls_check_if_admin_org_member() TO service_role;

GRANT ALL ON FUNCTION public.rls_get_member_org_id() TO anon;
GRANT ALL ON FUNCTION public.rls_get_member_org_id() TO authenticated;
GRANT ALL ON FUNCTION public.rls_get_member_org_id() TO service_role;

GRANT ALL ON FUNCTION public.rls_org_id_from_grid(integer) TO anon;
GRANT ALL ON FUNCTION public.rls_org_id_from_grid(integer) TO authenticated;
GRANT ALL ON FUNCTION public.rls_org_id_from_grid(integer) TO service_role;

GRANT ALL ON FUNCTION public.rls_org_id_from_customer(integer) TO anon;
GRANT ALL ON FUNCTION public.rls_org_id_from_customer(integer) TO authenticated;
GRANT ALL ON FUNCTION public.rls_org_id_from_customer(integer) TO service_role;

GRANT ALL ON FUNCTION public.rls_org_id_from_connection(integer) TO anon;
GRANT ALL ON FUNCTION public.rls_org_id_from_connection(integer) TO authenticated;
GRANT ALL ON FUNCTION public.rls_org_id_from_connection(integer) TO service_role;

GRANT ALL ON FUNCTION public.rls_org_id_from_agent(integer) TO anon;
GRANT ALL ON FUNCTION public.rls_org_id_from_agent(integer) TO authenticated;
GRANT ALL ON FUNCTION public.rls_org_id_from_agent(integer) TO service_role;

GRANT ALL ON FUNCTION public.rls_org_id_from_meter(integer) TO anon;
GRANT ALL ON FUNCTION public.rls_org_id_from_meter(integer) TO authenticated;
GRANT ALL ON FUNCTION public.rls_org_id_from_meter(integer) TO service_role;

GRANT ALL ON FUNCTION public.rls_org_id_from_dcu(integer) TO anon;
GRANT ALL ON FUNCTION public.rls_org_id_from_dcu(integer) TO authenticated;
GRANT ALL ON FUNCTION public.rls_org_id_from_dcu(integer) TO service_role;
