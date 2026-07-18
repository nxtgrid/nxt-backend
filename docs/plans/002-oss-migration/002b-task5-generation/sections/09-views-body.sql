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
