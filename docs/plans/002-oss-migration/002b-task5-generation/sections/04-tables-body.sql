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
    timezone character varying DEFAULT 'Africa/Lagos'::character varying NOT NULL,
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

