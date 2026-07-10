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
-- DB-native admin-organization flag; see the Functions section for the GUC
-- mechanism this backs).

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
