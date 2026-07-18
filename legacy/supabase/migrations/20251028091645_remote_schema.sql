-- **
-- * MANUAL EDIT :: Add our custom read_only roles
-- **

-- **
-- * Grafana
-- **
DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_roles WHERE rolname = 'grafana_readonly'
    ) THEN
        CREATE ROLE grafana_readonly LOGIN PASSWORD '<set-in-production>';
    END IF;
END
$$;
GRANT CONNECT ON DATABASE postgres TO grafana_readonly;

-- 1. Grant usage on the public schema
GRANT USAGE ON SCHEMA public TO grafana_readonly;
-- 2. Grant select on all tables in the public schema
GRANT SELECT ON ALL TABLES IN SCHEMA public TO grafana_readonly;
-- 3. Grant select on all future tables in the public schema
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA public GRANT SELECT ON TABLES TO grafana_readonly;

-- **
-- * Make
-- **
DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_roles WHERE rolname = 'make_readonly'
    ) THEN
        CREATE ROLE make_readonly LOGIN PASSWORD '<set-in-production>';
    END IF;
END
$$;
GRANT CONNECT ON DATABASE postgres TO make_readonly;

GRANT USAGE ON SCHEMA public TO make_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO make_readonly;
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA public GRANT SELECT ON TABLES TO make_readonly;

-- **
-- * Snaplet 2
-- **
DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_roles WHERE rolname = 'snaplet_readonly_2'
    ) THEN
        CREATE ROLE snaplet_readonly_2 LOGIN PASSWORD '<set-in-production>';
    END IF;
END
$$;
GRANT CONNECT ON DATABASE postgres TO snaplet_readonly_2;

GRANT USAGE ON SCHEMA public TO snaplet_readonly_2;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO snaplet_readonly_2;
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA public GRANT SELECT ON TABLES TO snaplet_readonly_2;

-- Also read rights to "auth" because it needs to copy users
GRANT USAGE ON SCHEMA auth TO snaplet_readonly_2;
GRANT SELECT ON ALL TABLES IN SCHEMA auth TO snaplet_readonly_2;


-- **
-- * Clean db dump begins here
-- **

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pgsodium";

COMMENT ON SCHEMA "public" IS 'standard public schema';

CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";

CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "postgis" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

CREATE TYPE "public"."account_type_enum" AS ENUM (
    'AGENT',
    'MEMBER',
    'CUSTOMER'
);

ALTER TYPE "public"."account_type_enum" OWNER TO "postgres";

CREATE TYPE "public"."communication_protocol_enum" AS ENUM (
    'CALIN_V1',
    'CALIN_V2',
    'CALIN_LORAWAN'
);

ALTER TYPE "public"."communication_protocol_enum" OWNER TO "postgres";

CREATE TYPE "public"."currency_enum" AS ENUM (
    'USD',
    'NGN',
    'EUR'
);

ALTER TYPE "public"."currency_enum" OWNER TO "postgres";

CREATE TYPE "public"."directive_direction_enum" AS ENUM (
    'UP',
    'DOWN'
);

ALTER TYPE "public"."directive_direction_enum" OWNER TO "postgres";

CREATE TYPE "public"."directive_error_enum" AS ENUM (
    'GRID_DOWN',
    'DCU_OFFLINE',
    'NO_METER',
    'NO_DCU',
    'NO_GRID',
    'NO_CONNECTION',
    'NO_CUSTOMER'
);

ALTER TYPE "public"."directive_error_enum" OWNER TO "postgres";

CREATE TYPE "public"."directive_phase_enum" AS ENUM (
    'A',
    'B',
    'C'
);

ALTER TYPE "public"."directive_phase_enum" OWNER TO "postgres";

CREATE TYPE "public"."directive_special_status_enum" AS ENUM (
    'POWER_LIMIT_BREACHED',
    'CREDIT_EXHAUSTED',
    'REMOTE_SWITCHED_OFF',
    'OVER_VOLTAGE',
    'METER_NOT_ACTIVATED',
    'TAMPER',
    'LOW_VOLTAGE'
);

ALTER TYPE "public"."directive_special_status_enum" OWNER TO "postgres";

CREATE TYPE "public"."directive_status_enum" AS ENUM (
    'INITIALISED',
    'PENDING',
    'SENT_TO_API',
    'RECEIVED_BY_API',
    'SENT_TO_DCU',
    'RECEIVED_BY_DCU',
    'SENT_TO_METER',
    'RECEIVED_BY_METER',
    'SUCCESSFUL',
    'FAILED',
    'IGNORED',
    'CANCELLED',
    'TIMED_OUT',
    'UNKNOWN'
);

ALTER TYPE "public"."directive_status_enum" OWNER TO "postgres";

CREATE TYPE "public"."directive_type_enum" AS ENUM (
    'ON',
    'OFF',
    'READ_VOLTAGE',
    'PLS',
    'PLR',
    'CLEAR_TAMPER',
    'READ_METER_VERSION',
    'TOP_UP',
    'READ_CURRENT_CREDIT',
    'READ_CURRENT',
    'READ_POWER',
    'READ_SPECIAL_STATUS',
    'CLEAR_CREDIT',
    'READ_RELAY_STATUS',
    'READ_POWER_DOWN_COUNT',
    'READ_TIME',
    'READ_DATE',
    'READ_VOLTAGE_A',
    'READ_VOLTAGE_B',
    'READ_VOLTAGE_C',
    'READ_POWER_A',
    'READ_POWER_B',
    'READ_POWER_C',
    'READ_CURRENT_A',
    'READ_CURRENT_B',
    'READ_CURRENT_C',
    'READ_TOTAL_ACTIVE_KWH',
    'READ_STATUS',
    'SEND_TOKEN',
    'READ_FRAUD_STATUS',
    'READ_REPORT',
    'WRITE_DATE',
    'WRITE_TIME',
    'CLEAR_TAMPER_TOKEN',
    'READ_REPORT_UP',
    'READ_REPORT_DOWN',
    'READ_CREDIT_DOWN',
    'READ_CREDIT_UP',
    'READ_VOLTAGE_UP',
    'READ_VOLTAGE_DOWN',
    'READ_POWER_UP',
    'READ_POWER_DOWN',
    'READ_CURRENT_UP',
    'READ_CURRENT_DOWN',
    'CLEAR_TAMPER_UP',
    'CLEAR_TAMPER_DOWN',
    'TOP_UP_DOWN',
    'POWER_LIMIT_SET_UP',
    'POWER_LIMIT_SET_DOWN',
    'OPEN_RELAY_UP',
    'OPEN_RELAY_DOWN',
    'CLOSE_RELAY_UP',
    'CLOSE_RELAY_DOWN',
    'READ_VOLTAGE_A_UP',
    'READ_VOLTAGE_A_DOWN',
    'READ_POWER_A_UP',
    'READ_POWER_A_DOWN',
    'READ_CURRENT_A_UP',
    'READ_CURRENT_A_DOWN',
    'UNKNOWN',
    'CLEAR_CREDIT_DOWN',
    'TOP_UP_KWH',
    'TOKEN_ACCEPTED',
    'TOKEN_REJECTED',
    'ON_OFF_ACCEPTED',
    'ON_OFF_REJECTED'
);

ALTER TYPE "public"."directive_type_enum" OWNER TO "postgres";

CREATE TYPE "public"."external_system_enum" AS ENUM (
    'STEAMACO',
    'CALIN',
    'SOLCAST',
    'VICTRON',
    'FLUTTERWAVE',
    'AFRICASTALKING',
    'JOTFORM',
    'EPICOLLECT',
    'JIRA',
    'TELEGRAM',
    'ZEROTIER',
    'MAKE',
    'FLOW_XO',
    'SENDGRID',
    'ACREL'
);

ALTER TYPE "public"."external_system_enum" OWNER TO "postgres";

CREATE TYPE "public"."fs_command_type_enum" AS ENUM (
    'ON',
    'OFF'
);

ALTER TYPE "public"."fs_command_type_enum" OWNER TO "postgres";

CREATE TYPE "public"."gender_enum" AS ENUM (
    'MALE',
    'FEMALE'
);

ALTER TYPE "public"."gender_enum" OWNER TO "postgres";

CREATE TYPE "public"."generator_type_enum" AS ENUM (
    'SMALL',
    'LARGE'
);

ALTER TYPE "public"."generator_type_enum" OWNER TO "postgres";

CREATE TYPE "public"."id_document_type_enum" AS ENUM (
    'PASSPORT',
    'NATIONAL_ID',
    'DRIVING_LICENSE',
    'VOTERS_CARD'
);

ALTER TYPE "public"."id_document_type_enum" OWNER TO "postgres";

CREATE TYPE "public"."issue_status_enum" AS ENUM (
    'OPEN',
    'CLOSED',
    'OVERRIDDEN'
);

ALTER TYPE "public"."issue_status_enum" OWNER TO "postgres";

CREATE TYPE "public"."issue_type_enum" AS ENUM (
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

ALTER TYPE "public"."issue_type_enum" OWNER TO "postgres";

CREATE TYPE "public"."member_type_enum" AS ENUM (
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

ALTER TYPE "public"."member_type_enum" OWNER TO "postgres";

CREATE TYPE "public"."meter_commissioning_status_enum" AS ENUM (
    'PENDING',
    'PROCESSING',
    'SUCCESSFUL',
    'FAILED'
);

ALTER TYPE "public"."meter_commissioning_status_enum" OWNER TO "postgres";

CREATE TYPE "public"."meter_credit_transfer_status_enum" AS ENUM (
    'PENDING',
    'PROCESSING',
    'SUCCESSFUL',
    'FAILED'
);

ALTER TYPE "public"."meter_credit_transfer_status_enum" OWNER TO "postgres";

CREATE TYPE "public"."meter_interaction_status_enum" AS ENUM (
    'QUEUED',
    'ABORTED',
    'PROCESSING',
    'SUCCESSFUL',
    'FAILED'
);

ALTER TYPE "public"."meter_interaction_status_enum" OWNER TO "postgres";

CREATE TYPE "public"."meter_interaction_type_enum" AS ENUM (
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
    'CLEAR_TAMPER'
);

ALTER TYPE "public"."meter_interaction_type_enum" OWNER TO "postgres";

CREATE TYPE "public"."meter_phase_enum" AS ENUM (
    'SINGLE_PHASE',
    'THREE_PHASE'
);

ALTER TYPE "public"."meter_phase_enum" OWNER TO "postgres";

CREATE TYPE "public"."meter_type_enum" AS ENUM (
    'HPS',
    'FS'
);

ALTER TYPE "public"."meter_type_enum" OWNER TO "postgres";

CREATE TYPE "public"."mhi_operation_enum" AS ENUM (
    'ADD',
    'REMOVE'
);

ALTER TYPE "public"."mhi_operation_enum" OWNER TO "postgres";

CREATE TYPE "public"."mhi_status_enum" AS ENUM (
    'PENDING',
    'PROCESSING',
    'SUCCESSFUL',
    'FAILED'
);

ALTER TYPE "public"."mhi_status_enum" OWNER TO "postgres";

CREATE TYPE "public"."mppt_type_enum" AS ENUM (
    'MPPT',
    'PV_INVERTER'
);

ALTER TYPE "public"."mppt_type_enum" OWNER TO "postgres";

CREATE TYPE "public"."notification_status_enum" AS ENUM (
    'PENDING',
    'PROCESSING',
    'RECEIVED_BY_API',
    'FAILED',
    'SUCCESSFUL',
    'READ',
    'UNKNOWN'
);

ALTER TYPE "public"."notification_status_enum" OWNER TO "postgres";

CREATE TYPE "public"."notification_type_enum" AS ENUM (
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
    'AUTO_PAYOUT_GENRATION_REPORT',
    'CREDIT_SENT',
    'CREDIT_RECEIVED',
    'METER_TOPPED_UP',
    'PAYMENT_REJECTED',
    'SITE_SUBMISSION'
);

ALTER TYPE "public"."notification_type_enum" OWNER TO "postgres";

CREATE TYPE "public"."order_actor_type_enum" AS ENUM (
    'BANKING_SYSTEM',
    'ORGANIZATION',
    'CONNECTION',
    'METER',
    'AGENT',
    'CUSTOMER'
);

ALTER TYPE "public"."order_actor_type_enum" OWNER TO "postgres";

CREATE TYPE "public"."order_status_enum" AS ENUM (
    'INITIALISED',
    'PENDING',
    'COMPLETED',
    'FAILED',
    'CANCELLED',
    'TIMED_OUT',
    'IGNORED'
);

ALTER TYPE "public"."order_status_enum" OWNER TO "postgres";

CREATE TYPE "public"."order_type_enum" AS ENUM (
    'ENERGY_TOPUP',
    'CONNECTION_PAYMENT',
    'CONNECTION_REFUND',
    'AGENT_WITHDRAWAL',
    'AGENT_TOPUP',
    'ORGANIZATION_TOPUP',
    'ORGANIZATION_WITHDRAWAL',
    'CUSTOMER_TOPUP'
);

ALTER TYPE "public"."order_type_enum" OWNER TO "postgres";

CREATE TYPE "public"."organization_type_enum" AS ENUM (
    'SOLAR_DEVELOPER',
    'LENDER',
    'DATA_AGGREGATOR'
);

ALTER TYPE "public"."organization_type_enum" OWNER TO "postgres";

CREATE TYPE "public"."payment_channel_enum" AS ENUM (
    'USSD',
    'AYRTON',
    'NIFFLER',
    'TELEGRAM'
);

ALTER TYPE "public"."payment_channel_enum" OWNER TO "postgres";

CREATE TYPE "public"."payment_method_enum" AS ENUM (
    'CREDIT_CARD',
    'USSD',
    'BANK_TRANSFER'
);

ALTER TYPE "public"."payment_method_enum" OWNER TO "postgres";

CREATE TYPE "public"."payout_status_enum" AS ENUM (
    'INITIALISED',
    'WAITING_FOR_APPROVAL',
    'PROCESSING',
    'SUCCESSFUL',
    'FAILED'
);

ALTER TYPE "public"."payout_status_enum" OWNER TO "postgres";

CREATE TYPE "public"."pd_action_status_enum" AS ENUM (
    'GENERATING',
    'GENERATION_FAILED',
    'GENERATION_COMPLETED',
    'ACTIONABLE',
    'ACTION_COMPLETED'
);

ALTER TYPE "public"."pd_action_status_enum" OWNER TO "postgres";

CREATE TYPE "public"."pd_action_type_enum" AS ENUM (
    'UPLOAD',
    'TEMPLATE',
    'EXTERNAL',
    'START',
    'END'
);

ALTER TYPE "public"."pd_action_type_enum" OWNER TO "postgres";

CREATE TYPE "public"."pd_document_type_enum" AS ENUM (
    'GOOGLE_SHEETS',
    'GOOGLE_DOCS'
);

ALTER TYPE "public"."pd_document_type_enum" OWNER TO "postgres";

CREATE TYPE "public"."solcast_cache_request_type_enum" AS ENUM (
    'ESTIMATED_ACTUALS',
    'FORECAST'
);

ALTER TYPE "public"."solcast_cache_request_type_enum" OWNER TO "postgres";

CREATE TYPE "public"."transaction_status_enum" AS ENUM (
    'SUCCESSFUL',
    'FAILED'
);

ALTER TYPE "public"."transaction_status_enum" OWNER TO "postgres";

CREATE TYPE "public"."wallet_type_enum" AS ENUM (
    'VIRTUAL',
    'REAL'
);

ALTER TYPE "public"."wallet_type_enum" OWNER TO "postgres";

CREATE TYPE "public"."weather_type_enum" AS ENUM (
    'CLOUDY',
    'CLOUDS',
    'SHOWERS',
    'SUNNY',
    'UNKNOWN',
    'CLOUDY_WITH_RAIN'
);

ALTER TYPE "public"."weather_type_enum" OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."append_rls_organization_id_by_account_id"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
	SELECT
		organization_id
	FROM
		accounts
	LEFT JOIN organizations ON organizations.id = accounts.organization_id INTO NEW.rls_organization_id
WHERE
	accounts.id = new.account_id;
	RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."append_rls_organization_id_by_account_id"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."append_rls_organization_id_by_connection_id"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
	SELECT
		organization_id
	FROM
		connections
	LEFT JOIN customers ON customers.id = connections.customer_id
	LEFT JOIN grids ON customers.grid_id = grids.id INTO NEW.rls_organization_id
WHERE
	connections.id = new.connection_id;
	RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."append_rls_organization_id_by_connection_id"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."append_rls_organization_id_by_customer_id"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
	SELECT
		organization_id
	FROM
		public.customers
	LEFT JOIN public.grids ON customers.grid_id = grids.id INTO NEW.rls_organization_id
WHERE
	customers.id = new.customer_id;
	RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."append_rls_organization_id_by_customer_id"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."append_rls_organization_id_by_customer_id_or_agent_id_or_connec"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
	rls_organization_id integer;
BEGIN
	IF NEW.customer_id IS NOT NULL THEN
		SELECT
			organization_id INTO rls_organization_id
		FROM
			customers
		LEFT JOIN grids ON customers.grid_id = grids.id
	WHERE
		customers.id = NEW.customer_id;
	ELSIF NEW.agent_id IS NOT NULL THEN
		SELECT
			organization_id INTO rls_organization_id
		FROM
			agents
		LEFT JOIN grids ON agents.grid_id = grids.id
	WHERE
		agents.id = NEW.agent_id;
	ELSIF NEW.connection_id IS NOT NULL THEN
		SELECT
			organization_id INTO rls_organization_id
		FROM
			connections
		LEFT JOIN customers ON customers.id = connections.customer_id
		LEFT JOIN grids ON customers.grid_id = grids.id
	WHERE
		connections.id = NEW.connection_id;
	ELSIF NEW.organization_id IS NOT NULL THEN
		SELECT
			id INTO rls_organization_id
		FROM
			organizations
		WHERE
			organizations.id = NEW.organization_id;
	ELSIF NEW.meter_id IS NOT NULL THEN
		SELECT
			organization_id INTO rls_organization_id
		FROM
			meters
		LEFT JOIN connections ON connections.id = meters.connection_id
		LEFT JOIN customers ON customers.id = connections.customer_id
		LEFT JOIN grids ON customers.grid_id = grids.id
	WHERE
		meters.id = NEW.meter_id;
	END IF;
	NEW.rls_organization_id = rls_organization_id;
	RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."append_rls_organization_id_by_customer_id_or_agent_id_or_connec"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."append_rls_organization_id_by_dcu_id_or_meter_id"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$DECLARE
	rls_organization_id integer;
BEGIN
	IF new.dcu_id IS NOT NULL THEN
		SELECT
			organization_id
		FROM
			dcus
		LEFT JOIN grids ON dcus.grid_id = grids.id INTO rls_organization_id
	WHERE
		dcus.id = new.dcu_id;
		elseif new.meter_id IS NOT NULL THEN
		SELECT
			organization_id
		FROM
			meters
		LEFT JOIN connections ON connections.id = meters.connection_id
		LEFT JOIN customers ON customers.id = connections.customer_id
		LEFT JOIN grids ON customers.grid_id = grids.id INTO rls_organization_id
	WHERE
		meters.id = new.meter_id;
	END IF;
	NEW.rls_organization_id = rls_organization_id;
	RETURN NEW;
END;$$;

ALTER FUNCTION "public"."append_rls_organization_id_by_dcu_id_or_meter_id"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."append_rls_organization_id_by_device_id"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$BEGIN
	SELECT
		organization_id
	FROM
		devices
  LEFT JOIN grids ON grids.id = devices.grid_id
  INTO NEW.rls_organization_id
WHERE
	devices.id = new.device_id;
	RETURN NEW;
END;$$;

ALTER FUNCTION "public"."append_rls_organization_id_by_device_id"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."append_rls_organization_id_by_directive_batch_id"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
	SELECT
		organization_id
	FROM
		directive_batches
	LEFT JOIN grids ON grids.id = directive_batches.grid_id INTO NEW.rls_organization_id
WHERE
	directive_batches.id = new.directive_batch_id;
	RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."append_rls_organization_id_by_directive_batch_id"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."append_rls_organization_id_by_grid_id"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
	SELECT
		organization_id
	FROM
		grids INTO NEW.rls_organization_id
	WHERE
		grids.id = new.grid_id;
	RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."append_rls_organization_id_by_grid_id"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."append_rls_organization_id_by_historical_grid_id"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
	SELECT
		organization_id
	FROM
		grids INTO NEW.rls_organization_id
	WHERE
		grids.id = new.historical_grid_id;
	RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."append_rls_organization_id_by_historical_grid_id"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."append_rls_organization_id_by_meter_id"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$BEGIN
	SELECT
		organization_id
	FROM meters
	LEFT JOIN connections ON connections.id = meters.connection_id
	LEFT JOIN customers ON customers.id = connections.customer_id
	LEFT JOIN grids ON customers.grid_id = grids.id INTO NEW.rls_organization_id
WHERE
	meters.id = new.meter_id;
	RETURN NEW;
END;$$;

ALTER FUNCTION "public"."append_rls_organization_id_by_meter_id"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."append_rls_organization_id_by_metering_hardware_install_session"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$BEGIN
	SELECT
		organization_id
	FROM metering_hardware_install_sessions
  left join meters on meters.id = metering_hardware_install_sessions.meter_id
	LEFT JOIN connections ON connections.id = meters.connection_id
	LEFT JOIN customers ON customers.id = connections.customer_id
	LEFT JOIN grids ON customers.grid_id = grids.id INTO NEW.rls_organization_id
WHERE
	metering_hardware_install_sessions.id = new.metering_hardware_install_session_id;
	RETURN NEW;
END;$$;

ALTER FUNCTION "public"."append_rls_organization_id_by_metering_hardware_install_session"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."append_rls_organization_id_by_order_id"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
	SELECT
		organization_id
	FROM
		orders
	LEFT JOIN grids ON historical_grid_id = grids.id INTO NEW.rls_organization_id
WHERE
	orders.id = new.order_id;
	RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."append_rls_organization_id_by_order_id"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."append_rls_organization_id_by_receiver_meter_id"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
	SELECT
		organization_id
	FROM
		meters
	LEFT JOIN connections ON connections.id = meters.connection_id
	LEFT JOIN customers ON customers.id = connections.customer_id
	LEFT JOIN grids ON customers.grid_id = grids.id INTO NEW.rls_organization_id
WHERE
	meters.id = new.receiver_meter_id;
	RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."append_rls_organization_id_by_receiver_meter_id"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."find_energy_topup_revenue"("grid_id" integer, "start_date" timestamp with time zone, "end_date" timestamp with time zone) RETURNS numeric
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
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

ALTER FUNCTION "public"."find_energy_topup_revenue"("grid_id" integer, "start_date" timestamp with time zone, "end_date" timestamp with time zone) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."find_top_spenders"("grid_id" integer, "limit_count" integer, "start_date" timestamp with time zone, "end_date" timestamp with time zone) RETURNS TABLE("full_name" character varying, "id" integer, "amount" double precision)
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
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
		meta_receiver_id,
		meta_receiver_id_part_2,
		meta_receiver_name_part_2
	ORDER BY
		SUM(
			_orders.amount
) DESC
	LIMIT limit_count;
END;
$$;

ALTER FUNCTION "public"."find_top_spenders"("grid_id" integer, "limit_count" integer, "start_date" timestamp with time zone, "end_date" timestamp with time zone) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_grid_status"("grid_id" integer) RETURNS TABLE("is_hps_on" boolean, "is_fs_on" boolean, "are_all_dcus_online" boolean, "are_all_dcus_under_high_load_threshold" boolean, "is_cabin_meter_credit_depleting" boolean, "customer_count" integer)
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
	RETURN QUERY
	SELECT
		_grid.is_hps_on,
		_grid.is_fs_on,
		_grid.are_all_dcus_online,
		_grid.are_all_dcus_under_high_load_threshold,
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
END;
$$;

ALTER FUNCTION "public"."get_grid_status"("grid_id" integer) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
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

ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."handle_update_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
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

ALTER FUNCTION "public"."handle_update_user"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."lock_next_order"("uuid" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
	order_id_var integer;
	sender_wallet_id_var integer;
	receiver_wallet_id_var integer;
BEGIN
	SELECT
		_orders.id,
		_orders.sender_wallet_id,
		_orders.receiver_wallet_id INTO order_id_var,
		sender_wallet_id_var,
		receiver_wallet_id_var
	FROM
		public.orders _orders
	LEFT JOIN public.wallets AS sender_wallets ON sender_wallets.id = _orders.sender_wallet_id
	LEFT JOIN public.wallets AS receiver_wallets ON receiver_wallets.id = _orders.receiver_wallet_id
WHERE
	_orders.order_status = 'PENDING'
	AND sender_wallets.lock_session IS NULL
	AND receiver_wallets.lock_session IS NULL
ORDER BY
	_orders.id ASC
LIMIT 1;
	UPDATE
		public.orders
	SET
		lock_session = uuid
	WHERE
		id = order_id_var;
	UPDATE
		public.wallets
	SET
		lock_session = uuid
	WHERE
		id = sender_wallet_id_var
		OR id = receiver_wallet_id_var;
END;
$$;

ALTER FUNCTION "public"."lock_next_order"("uuid" "uuid") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."lock_next_pd_action"() RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
	result integer;
BEGIN
	SELECT
		pd_actions.id INTO result
	FROM
		pd_actions
	WHERE
		pd_action_status = 'INITIALISING'
	LIMIT 1;
	UPDATE
		pd_actions
	SET
		pd_action_status = 'INITIALISED'
	WHERE
		pd_actions.id = result;
	RETURN result;
END;
$$;

ALTER FUNCTION "public"."lock_next_pd_action"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."notify_make_about_is_fs_on_updated"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$BEGIN
  IF NEW.is_fs_on IS DISTINCT FROM OLD.is_fs_on and NEW.is_fs_on_notification_enabled is true THEN
    perform net.http_post(
      url:='https://hook.eu2.make.com/86h2to0kcomzk49en458ox2pkgm48rv2',
      headers := '{"Content-Type": "application/json"}',
      body:= json_build_object(
        'grid_id', NEW.id,
        'grid_name', NEW.name,
        'is_fs_on', NEW.is_fs_on,
        'updated_at', now()
      )::jsonb
    );
  END IF;
  RETURN NEW;
END;$$;

ALTER FUNCTION "public"."notify_make_about_is_fs_on_updated"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."notify_make_about_is_hps_on_updated"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$BEGIN
  IF NEW.is_hps_on IS DISTINCT FROM OLD.is_hps_on and NEW.is_energised_notification_enabled is true THEN
    perform net.http_post(
      url:='https://hook.eu2.make.com/86h2to0kcomzk49en458ox2pkgm48rv2',
      headers := '{"Content-Type": "application/json"}',
      body:= json_build_object(
        'grid_id', NEW.id,
        'grid_name', NEW.name,
        'is_hps_on', NEW.is_hps_on,
        'updated_at', now()
      )::jsonb
    );
  END IF;
  RETURN NEW;
END;$$;

ALTER FUNCTION "public"."notify_make_about_is_hps_on_updated"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."notify_make_about_kwh_tariff_essential_service_updated"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$BEGIN
  IF NEW.kwh_tariff_essential_service IS DISTINCT FROM OLD.kwh_tariff_essential_service and NEW.is_tariff_change_notification_enabled is true THEN
    perform net.http_post(
      url:='https://hook.eu2.make.com/86h2to0kcomzk49en458ox2pkgm48rv2',
      headers := '{"Content-Type": "application/json"}',
      body:= json_build_object(
        'grid_id', NEW.id,
        'grid_name', NEW.name,
        'kwh_tariff_essential_service', NEW.kwh_tariff_essential_service,
        'updated_at', now()
      )::jsonb
    );
  END IF;
  RETURN NEW;
END;$$;

ALTER FUNCTION "public"."notify_make_about_kwh_tariff_essential_service_updated"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."rls_check_if_lender"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
	RETURN (auth.jwt () -> 'app_metadata' ->> 'organization_type')::text = 'LENDER';
END;
$$;

ALTER FUNCTION "public"."rls_check_if_lender"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."rls_check_if_nxt_member"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
	nxt_org_id int := 2;
	app_meta jsonb := auth.jwt () -> 'app_metadata';
BEGIN
	RETURN (app_meta ->> 'account_type' = 'MEMBER'
		AND(app_meta ->> 'organization_id')::int = nxt_org_id);
END;
$$;

ALTER FUNCTION "public"."rls_check_if_nxt_member"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."rls_get_member_org_id"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
	RETURN (auth.jwt () -> 'app_metadata' ->> 'organization_id')::int;
END;
$$;

ALTER FUNCTION "public"."rls_get_member_org_id"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";

CREATE TABLE IF NOT EXISTS "public"."accounts" (
    "id" integer NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "full_name" character varying,
    "email" character varying,
    "phone" character varying,
    "telegram_id" character varying,
    "telegram_link_token" character varying,
    "deleted_at" timestamp(3) without time zone,
    "supabase_id" "uuid",
    "organization_id" integer
);

ALTER TABLE "public"."accounts" OWNER TO "postgres";

CREATE SEQUENCE IF NOT EXISTS "public"."accounts_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."accounts_id_seq" OWNER TO "postgres";

ALTER SEQUENCE "public"."accounts_id_seq" OWNED BY "public"."accounts"."id";

CREATE TABLE IF NOT EXISTS "public"."agents" (
    "id" integer NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "grid_id" integer,
    "account_id" integer,
    "rls_organization_id" integer
);

ALTER TABLE "public"."agents" OWNER TO "postgres";

CREATE SEQUENCE IF NOT EXISTS "public"."agents_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."agents_id_seq" OWNER TO "postgres";

ALTER SEQUENCE "public"."agents_id_seq" OWNED BY "public"."agents"."id";

CREATE OR REPLACE VIEW "public"."agents_with_account" WITH ("security_invoker"='true') AS
 SELECT "agents"."id",
    "agents"."created_at",
    "agents"."grid_id",
    "agents"."account_id",
    "accounts"."full_name",
    "accounts"."phone",
    "accounts"."deleted_at"
   FROM ("public"."agents"
     JOIN "public"."accounts" ON (("agents"."account_id" = "accounts"."id")));

ALTER TABLE "public"."agents_with_account" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."api_keys" (
    "id" integer NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "is_locked" boolean DEFAULT false NOT NULL,
    "key" character varying,
    "account_id" integer
);

ALTER TABLE "public"."api_keys" OWNER TO "postgres";

CREATE SEQUENCE IF NOT EXISTS "public"."api_keys_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."api_keys_id_seq" OWNER TO "postgres";

ALTER SEQUENCE "public"."api_keys_id_seq" OWNED BY "public"."api_keys"."id";

CREATE TABLE IF NOT EXISTS "public"."audits" (
    "id" integer NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "message" character varying NOT NULL,
    "from_fs_command" boolean DEFAULT false NOT NULL,
    "author_id" integer,
    "grid_id" integer,
    "organization_id" integer,
    "meter_id" integer,
    "agent_id" integer,
    "customer_id" integer,
    "member_id" integer,
    "connection_id" integer,
    "dcu_id" integer
);

ALTER TABLE "public"."audits" OWNER TO "postgres";

CREATE SEQUENCE IF NOT EXISTS "public"."audits_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."audits_id_seq" OWNER TO "postgres";

ALTER SEQUENCE "public"."audits_id_seq" OWNED BY "public"."audits"."id";

CREATE TABLE IF NOT EXISTS "public"."autopilot_executions" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "input" "jsonb",
    "code" "text",
    "output" "jsonb",
    "queries" "jsonb"
);

ALTER TABLE "public"."autopilot_executions" OWNER TO "postgres";

ALTER TABLE "public"."autopilot_executions" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."autopilot_executions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."bank_accounts" (
    "id" integer NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "organization_id" integer,
    "bank_id" integer
);

ALTER TABLE "public"."bank_accounts" OWNER TO "postgres";

CREATE SEQUENCE IF NOT EXISTS "public"."bank_accounts_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."bank_accounts_id_seq" OWNER TO "postgres";

ALTER SEQUENCE "public"."bank_accounts_id_seq" OWNED BY "public"."bank_accounts"."id";

CREATE TABLE IF NOT EXISTS "public"."banks" (
    "id" integer NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "name" character varying NOT NULL,
    "external_id" character varying NOT NULL
);

ALTER TABLE "public"."banks" OWNER TO "postgres";

CREATE SEQUENCE IF NOT EXISTS "public"."banks_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."banks_id_seq" OWNER TO "postgres";

ALTER SEQUENCE "public"."banks_id_seq" OWNED BY "public"."banks"."id";

CREATE TABLE IF NOT EXISTS "public"."dcus" (
    "id" integer NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "external_reference" character varying NOT NULL,
    "queue_buffer_length" integer DEFAULT 50 NOT NULL,
    "external_system" "public"."external_system_enum" NOT NULL,
    "is_online" boolean DEFAULT false NOT NULL,
    "last_online_at" timestamp(3) with time zone,
    "is_online_updated_at" timestamp(3) with time zone,
    "communication_protocol" "public"."communication_protocol_enum",
    "grid_id" integer,
    "last_metering_hardware_install_session_id" integer,
    "rls_organization_id" integer,
    "location_geom" "extensions"."geometry"(Point,4326)
);

ALTER TABLE "public"."dcus" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."directives" (
    "id" bigint NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp(3) with time zone,
    "directive_priority" integer DEFAULT 0 NOT NULL,
    "directive_status" "public"."directive_status_enum" DEFAULT 'PENDING'::"public"."directive_status_enum" NOT NULL,
    "directive_status_a" "public"."directive_status_enum",
    "directive_status_b" "public"."directive_status_enum",
    "directive_status_c" "public"."directive_status_enum",
    "directive_type" "public"."directive_type_enum" NOT NULL,
    "external_reference" character varying,
    "external_reference_a" character varying,
    "external_reference_b" character varying,
    "external_reference_c" character varying,
    "power_down_count" integer,
    "power_limit" integer,
    "power_limit_should_be" integer,
    "is_on" boolean,
    "kwh" double precision,
    "kwh_credit_available" double precision,
    "voltage" double precision,
    "voltage_a" double precision,
    "voltage_b" double precision,
    "voltage_c" double precision,
    "power" double precision,
    "power_a" double precision,
    "power_b" double precision,
    "power_c" double precision,
    "directive_special_status" "public"."directive_special_status_enum",
    "directive_error" "public"."directive_error_enum",
    "token" character varying,
    "meter_version" character varying,
    "execution_session" character varying,
    "status_last_checked_at" timestamp(3) with time zone,
    "status_check_lock_session" character varying,
    "directive_batch_deprecated_id" integer,
    "can_be_retried" boolean,
    "meter_id" integer,
    "directive_batch_execution_id" integer,
    "order_id" integer,
    "meter_commissioning_id" integer,
    "directive_watchdog_session_id" integer,
    "meter_credit_transfer_id" integer,
    "retry_of_directive_id" bigint,
    "author_id" integer,
    "rls_organization_id" integer
);

ALTER TABLE "public"."directives" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."lorawan_directives" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "meter_id" integer,
    "author_id" integer,
    "directive_status" "public"."directive_status_enum" NOT NULL,
    "directive_type" "public"."directive_type_enum",
    "order_id" integer,
    "kwh" real,
    "power_a" real,
    "power_b" real,
    "power_c" real,
    "voltage_a" real,
    "voltage_b" real,
    "voltage_c" real,
    "token" "text",
    "is_on" boolean,
    "kwh_credit_available" double precision,
    "current_a" double precision,
    "current_b" double precision,
    "current_c" double precision,
    "can_be_retried" boolean,
    "directive_watchdog_session_id" integer,
    "power_limit" integer,
    "power_limit_should_be" integer,
    "retry_of_directive_id" bigint,
    "meter_commissioning_id" integer,
    "directive_batch_execution_id" integer,
    "value" "jsonb",
    "external_reference" "text",
    "directive_direction" "public"."directive_direction_enum" NOT NULL,
    "directive_phase" "public"."directive_phase_enum",
    "rls_organization_id" integer,
    "directive_error" "public"."directive_error_enum"
);

ALTER TABLE "public"."lorawan_directives" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."meters" (
    "id" integer NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "external_reference" character varying NOT NULL,
    "deleted_at" timestamp(3) without time zone,
    "balance" double precision,
    "balance_updated_at" timestamp(3) with time zone,
    "kwh_credit_available" double precision,
    "kwh_credit_available_updated_at" timestamp(3) with time zone,
    "last_non_zero_consumption_at" timestamp(3) with time zone,
    "is_on" boolean DEFAULT false,
    "should_be_on" boolean DEFAULT false,
    "is_on_updated_at" timestamp(3) with time zone,
    "should_be_on_updated_at" timestamp(3) with time zone,
    "is_manual_mode_on" boolean DEFAULT false NOT NULL,
    "is_manual_mode_on_updated_at" timestamp(3) with time zone,
    "voltage" double precision,
    "voltage_updated_at" timestamp(3) with time zone,
    "power" double precision,
    "power_updated_at" timestamp(3) with time zone,
    "latitude" double precision,
    "longitude" double precision,
    "coord_accuracy" double precision DEFAULT '0'::double precision NOT NULL,
    "power_limit" integer,
    "power_limit_updated_at" timestamp(3) with time zone,
    "power_limit_should_be" integer,
    "power_down_count" integer,
    "power_down_count_updated_at" timestamp(3) without time zone,
    "power_limit_should_be_updated_at" timestamp(3) with time zone,
    "is_starred" boolean DEFAULT false NOT NULL,
    "external_system" "public"."external_system_enum" NOT NULL,
    "meter_type" "public"."meter_type_enum" DEFAULT 'HPS'::"public"."meter_type_enum" NOT NULL,
    "nickname" character varying,
    "last_seen_at" timestamp(3) with time zone,
    "issue_check_execution_session" character varying,
    "issue_check_last_run_at" timestamp(3) with time zone,
    "pole_id" integer,
    "meter_phase" "public"."meter_phase_enum" DEFAULT 'SINGLE_PHASE'::"public"."meter_phase_enum" NOT NULL,
    "last_metering_hardware_install_session_id" integer,
    "kwh_tariff" double precision,
    "watchdog_session" character varying,
    "watchdog_last_run_at" timestamp(3) with time zone,
    "version" character varying,
    "is_simulated" boolean DEFAULT false NOT NULL,
    "power_limit_hps_mode" integer DEFAULT 200 NOT NULL,
    "current_special_status" "public"."directive_special_status_enum",
    "communication_protocol" "public"."communication_protocol_enum" DEFAULT 'CALIN_LORAWAN'::public.communication_protocol_enum,
    "is_cabin_meter" boolean DEFAULT false NOT NULL,
    "last_encountered_issue_id" integer,
    "connection_id" integer,
    "dcu_id" integer,
    "decoder_key" "text",
    "last_sts_token_issued_at" timestamp with time zone,
    "rls_grid_id" integer,
    "rls_organization_id" integer,
    "is_test_mode_on" boolean DEFAULT false NOT NULL,
    "pulse_counter_kwh" double precision,
    "device_id" bigint,
    "pulse_counter_kwh_updated_at" timestamp with time zone,
    "connection_metrics" "jsonb"
);

ALTER TABLE "public"."meters" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."poles" (
    "id" integer NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "external_reference" character varying(10) NOT NULL,
    "nickname" character varying,
    "is_virtual" boolean DEFAULT false NOT NULL,
    "location_accuracy" double precision,
    "grid_id" integer,
    "location_geom" "extensions"."geometry"(Point,4326) NOT NULL,
    "rls_organization_id" integer
);

ALTER TABLE "public"."poles" OWNER TO "postgres";

CREATE OR REPLACE VIEW "public"."batch_commands" WITH ("security_invoker"='true') AS
 SELECT "directives"."id",
    "directives"."directive_type",
    "directives"."directive_status",
    "directives"."created_at",
    "directives"."meter_id",
    "directives"."directive_batch_execution_id",
    "directives"."directive_error",
    "meters"."external_reference" AS "meter_external_reference",
    "meters"."meter_type",
    "meters"."latitude",
    "meters"."longitude",
    "poles"."location_geom",
    "dcus"."id" AS "dcu_id",
    "dcus"."external_reference" AS "dcu_external_reference"
   FROM ((("public"."directives"
     LEFT JOIN "public"."meters" ON (("meters"."id" = "directives"."meter_id")))
     LEFT JOIN "public"."dcus" ON (("dcus"."id" = "meters"."dcu_id")))
     LEFT JOIN "public"."poles" ON (("poles"."id" = "meters"."pole_id")))
UNION ALL
 SELECT "lorawan_directives"."id",
    "lorawan_directives"."directive_type",
    "lorawan_directives"."directive_status",
    "lorawan_directives"."created_at",
    "lorawan_directives"."meter_id",
    "lorawan_directives"."directive_batch_execution_id",
    "lorawan_directives"."directive_error",
    "meters"."external_reference" AS "meter_external_reference",
    "meters"."meter_type",
    "meters"."latitude",
    "meters"."longitude",
    "poles"."location_geom",
    "dcus"."id" AS "dcu_id",
    "dcus"."external_reference" AS "dcu_external_reference"
   FROM ((("public"."lorawan_directives"
     LEFT JOIN "public"."meters" ON (("meters"."id" = "lorawan_directives"."meter_id")))
     LEFT JOIN "public"."dcus" ON (("dcus"."id" = "meters"."dcu_id")))
     LEFT JOIN "public"."poles" ON (("poles"."id" = "meters"."pole_id")));

ALTER TABLE "public"."batch_commands" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."connection_requested_meters" (
    "id" integer NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "meter_type" "public"."meter_type_enum" NOT NULL,
    "meter_phase" "public"."meter_phase_enum" NOT NULL,
    "fee" double precision DEFAULT '0'::double precision NOT NULL,
    "deleted_at" timestamp(3) without time zone,
    "connection_id" integer NOT NULL,
    "rls_organization_id" integer
);

ALTER TABLE "public"."connection_requested_meters" OWNER TO "postgres";

CREATE SEQUENCE IF NOT EXISTS "public"."connection_requested_meters_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."connection_requested_meters_id_seq" OWNER TO "postgres";

ALTER SEQUENCE "public"."connection_requested_meters_id_seq" OWNED BY "public"."connection_requested_meters"."id";

CREATE TABLE IF NOT EXISTS "public"."connections" (
    "id" integer NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp(3) without time zone,
    "document_type" "public"."id_document_type_enum" DEFAULT 'PASSPORT'::"public"."id_document_type_enum",
    "document_id" character varying,
    "upload_uuid" character varying,
    "external_system" "public"."external_system_enum" DEFAULT 'EPICOLLECT'::"public"."external_system_enum",
    "paid" double precision DEFAULT '0'::double precision NOT NULL,
    "currency" "public"."currency_enum" NOT NULL,
    "women_impacted" integer NOT NULL,
    "is_lifeline" boolean,
    "is_public" boolean NOT NULL,
    "is_commercial" boolean NOT NULL,
    "is_residential" boolean NOT NULL,
    "is_building_wired" boolean DEFAULT false,
    "is_using_led_bulbs" boolean DEFAULT false,
    "customer_id" integer,
    "rls_organization_id" integer
);

ALTER TABLE "public"."connections" OWNER TO "postgres";

CREATE SEQUENCE IF NOT EXISTS "public"."connections_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."connections_id_seq" OWNER TO "postgres";

ALTER SEQUENCE "public"."connections_id_seq" OWNED BY "public"."connections"."id";

CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" integer NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "gender" "public"."gender_enum",
    "total_connection_fee" double precision DEFAULT '0'::double precision NOT NULL,
    "total_connection_paid" double precision DEFAULT '0'::double precision NOT NULL,
    "is_hidden_from_reporting" boolean DEFAULT false NOT NULL,
    "lives_primarily_in_the_community" boolean DEFAULT true NOT NULL,
    "latitude" double precision,
    "longitude" double precision,
    "generator_owned" "public"."generator_type_enum",
    "grid_id" integer,
    "account_id" integer,
    "rls_organization_id" integer
);

ALTER TABLE "public"."customers" OWNER TO "postgres";

CREATE SEQUENCE IF NOT EXISTS "public"."customers_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."customers_id_seq" OWNER TO "postgres";

ALTER SEQUENCE "public"."customers_id_seq" OWNED BY "public"."customers"."id";

CREATE OR REPLACE VIEW "public"."customers_with_account" WITH ("security_invoker"='true') AS
 SELECT "c"."id",
    "c"."created_at",
    "c"."gender",
    "c"."total_connection_fee",
    "c"."total_connection_paid",
    "c"."is_hidden_from_reporting",
    "c"."lives_primarily_in_the_community",
    "c"."latitude",
    "c"."longitude",
    "c"."generator_owned",
    "c"."grid_id",
    "c"."account_id",
    "a"."full_name",
    "a"."phone",
    "a"."deleted_at",
    ("c"."total_connection_paid" >= "c"."total_connection_fee") AS "has_fully_paid_connection_fees",
    ( SELECT "string_agg"(("m"."external_reference")::"text", ', '::"text") AS "string_agg"
           FROM ("public"."connections" "conn"
             JOIN "public"."meters" "m" ON (("m"."connection_id" = "conn"."id")))
          WHERE ("conn"."customer_id" = "c"."id")) AS "meter"
   FROM ("public"."customers" "c"
     JOIN "public"."accounts" "a" ON (("c"."account_id" = "a"."id")));

ALTER TABLE "public"."customers_with_account" OWNER TO "postgres";

CREATE SEQUENCE IF NOT EXISTS "public"."dcus_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."dcus_id_seq" OWNER TO "postgres";

ALTER SEQUENCE "public"."dcus_id_seq" OWNED BY "public"."dcus"."id";

CREATE TABLE IF NOT EXISTS "public"."device_logs" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "message" "text",
    "device_id" bigint,
    "rls_organization_id" integer
);

ALTER TABLE "public"."device_logs" OWNER TO "postgres";

ALTER TABLE "public"."device_logs" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."device_logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."device_types" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text",
    "external_system" "public"."external_system_enum"
);

ALTER TABLE "public"."device_types" OWNER TO "postgres";

ALTER TABLE "public"."device_types" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."device_types_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."devices" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "device_type_id" bigint NOT NULL,
    "external_reference" "text" NOT NULL,
    "grid_id" integer,
    "nickname" "text",
    "rls_organization_id" integer,
    "values" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);

ALTER TABLE "public"."devices" OWNER TO "postgres";

ALTER TABLE "public"."devices" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."devices_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."directive_batch_executions" (
    "id" integer NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "successful_delivery_percent" double precision DEFAULT 0 NOT NULL,
    "delivery_status_check_lock_session" character varying,
    "pending_count" integer DEFAULT 0 NOT NULL,
    "processing_count" integer DEFAULT 0 NOT NULL,
    "successful_count" integer DEFAULT 0 NOT NULL,
    "failed_count" integer DEFAULT 0 NOT NULL,
    "processed_count" integer DEFAULT 0 NOT NULL,
    "total_count" integer DEFAULT 0 NOT NULL,
    "goldring_migration_id" integer,
    "directive_batch_id" integer,
    "rls_organization_id" integer
);

ALTER TABLE "public"."directive_batch_executions" OWNER TO "postgres";

CREATE SEQUENCE IF NOT EXISTS "public"."directive_batch_executions_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."directive_batch_executions_id_seq" OWNER TO "postgres";

ALTER SEQUENCE "public"."directive_batch_executions_id_seq" OWNED BY "public"."directive_batch_executions"."id";

CREATE TABLE IF NOT EXISTS "public"."directive_batches" (
    "id" integer NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "hour" integer NOT NULL,
    "minute" integer NOT NULL,
    "is_repeating" boolean DEFAULT false NOT NULL,
    "grid_id" integer,
    "directive_type" "public"."directive_type_enum",
    "fs_command" "public"."fs_command_type_enum",
    "lock_session" character varying,
    "execution_bucket" integer,
    "author_id" integer,
    "updated_at" timestamp(3) with time zone,
    "rls_organization_id" integer
);

ALTER TABLE "public"."directive_batches" OWNER TO "postgres";

CREATE SEQUENCE IF NOT EXISTS "public"."directive_batches_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."directive_batches_id_seq" OWNER TO "postgres";

ALTER SEQUENCE "public"."directive_batches_id_seq" OWNED BY "public"."directive_batches"."id";

CREATE TABLE IF NOT EXISTS "public"."directive_watchdog_sessions" (
    "id" integer NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "identifier" character varying
);

ALTER TABLE "public"."directive_watchdog_sessions" OWNER TO "postgres";

CREATE SEQUENCE IF NOT EXISTS "public"."directive_watchdog_sessions_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."directive_watchdog_sessions_id_seq" OWNER TO "postgres";

ALTER SEQUENCE "public"."directive_watchdog_sessions_id_seq" OWNED BY "public"."directive_watchdog_sessions"."id";

CREATE SEQUENCE IF NOT EXISTS "public"."directives_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."directives_id_seq" OWNER TO "postgres";

ALTER SEQUENCE "public"."directives_id_seq" OWNED BY "public"."directives"."id";

CREATE TABLE IF NOT EXISTS "public"."energy_cabins" (
    "id" integer NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "grid_id" integer NOT NULL,
    "location_geom" "extensions"."geometry"(Point,4326) NOT NULL,
    "rls_organization_id" integer
);

ALTER TABLE "public"."energy_cabins" OWNER TO "postgres";

CREATE SEQUENCE IF NOT EXISTS "public"."energy_cabins_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."energy_cabins_id_seq" OWNER TO "postgres";

ALTER SEQUENCE "public"."energy_cabins_id_seq" OWNED BY "public"."energy_cabins"."id";

CREATE TABLE IF NOT EXISTS "public"."features" (
    "id" integer NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "uuid" character varying NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL
);

ALTER TABLE "public"."features" OWNER TO "postgres";

CREATE SEQUENCE IF NOT EXISTS "public"."features_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."features_id_seq" OWNER TO "postgres";

ALTER SEQUENCE "public"."features_id_seq" OWNED BY "public"."features"."id";

CREATE TABLE IF NOT EXISTS "public"."grids" (
    "id" integer NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "deployed_at" timestamp(3) with time zone,
    "commissioned_at" timestamp(3) with time zone,
    "name" character varying NOT NULL,
    "is_hps_on" boolean DEFAULT false NOT NULL,
    "is_hps_on_updated_at" timestamp(3) with time zone,
    "walkthrough_external_id" character varying,
    "timezone" character varying DEFAULT 'Africa/Lagos'::character varying NOT NULL,
    "latitude" double precision,
    "longitude" double precision,
    "kwp" double precision DEFAULT '0'::double precision NOT NULL,
    "kwh" double precision DEFAULT '0'::double precision NOT NULL,
    "kwp_tariff" double precision DEFAULT '0'::double precision NOT NULL,
    "kwh_tariff" double precision DEFAULT '0'::double precision NOT NULL,
    "kwh_tariff_essential_service" double precision DEFAULT '0'::double precision NOT NULL,
    "kwh_tariff_full_service" double precision DEFAULT '0'::double precision NOT NULL,
    "current_weather" "public"."weather_type_enum",
    "generation_external_system" "public"."external_system_enum" DEFAULT 'VICTRON'::"public"."external_system_enum" NOT NULL,
    "metering_external_system" "public"."external_system_enum" DEFAULT 'CALIN'::"public"."external_system_enum" NOT NULL,
    "generation_external_site_id" character varying,
    "generation_external_gateway_id" character varying,
    "generation_gateway_last_seen_at" timestamp(3) with time zone,
    "is_fs_on" boolean DEFAULT false NOT NULL,
    "is_fs_on_updated_at" timestamp(3) with time zone,
    "should_fs_be_on" boolean DEFAULT false NOT NULL,
    "should_fs_be_on_updated_at" timestamp(3) with time zone,
    "default_hps_connection_fee" double precision DEFAULT '0'::double precision NOT NULL,
    "default_fs_1_phase_connection_fee" double precision DEFAULT '0'::double precision NOT NULL,
    "default_fs_3_phase_connection_fee" double precision DEFAULT '0'::double precision NOT NULL,
    "monthly_rental" double precision DEFAULT '0'::double precision NOT NULL,
    "are_all_dcus_online" boolean DEFAULT false NOT NULL,
    "are_all_dcus_under_high_load_threshold" boolean DEFAULT true NOT NULL,
    "is_hidden_from_reporting" boolean DEFAULT true NOT NULL,
    "is_three_phase_supported" boolean DEFAULT false NOT NULL,
    "is_using_vsat" boolean DEFAULT false NOT NULL,
    "is_using_mobile_network" boolean DEFAULT false NOT NULL,
    "is_hps_on_threshold_kw" double precision,
    "kwh_per_battery_module" double precision,
    "identifier" integer,
    "lifeline_connection_kwh_threshold" integer DEFAULT 5 NOT NULL,
    "lifeline_connection_days_threshold" integer DEFAULT 30 NOT NULL,
    "meter_consumption_issue_threshold_detection_days" integer DEFAULT 30 NOT NULL,
    "meter_communication_issue_threshold_detection_days" integer DEFAULT 7 NOT NULL,
    "uses_dual_meter_setup" boolean DEFAULT false NOT NULL,
    "is_panel_cleaning_notification_enabled" boolean DEFAULT false NOT NULL,
    "is_energised_notification_enabled" boolean DEFAULT false NOT NULL,
    "is_fs_on_notification_enabled" boolean DEFAULT false NOT NULL,
    "is_metering_hardware_online_notification_enabled" boolean DEFAULT false NOT NULL,
    "is_tariff_change_notification_enabled" boolean DEFAULT false NOT NULL,
    "is_upcoming_fs_control_rule_notification_enabled" boolean DEFAULT false NOT NULL,
    "is_fs_control_rule_change_notification_enabled" boolean DEFAULT false NOT NULL,
    "is_automatic_meter_install_enabled" boolean DEFAULT false NOT NULL,
    "is_automatic_payout_generation_enabled" boolean DEFAULT false NOT NULL,
    "is_automatic_energy_generation_data_sync_enabled" boolean DEFAULT false NOT NULL,
    "is_automatic_meter_energy_consumption_data_sync_enabled" boolean DEFAULT false NOT NULL,
    "is_dcu_connectivity_tracking_enabled" boolean DEFAULT false NOT NULL,
    "is_router_connectivity_tracking_enabled" boolean DEFAULT false NOT NULL,
    "is_cabin_meter_credit_depleting" boolean DEFAULT false NOT NULL,
    "telegram_response_path_token" character varying,
    "telegram_notification_channel_invite_link" character varying,
    "telegram_response_path_autopilot" character varying,
    "internal_telegram_group_chat_id" character varying,
    "internal_telegram_group_thread_id" character varying,
    "organization_id" integer NOT NULL,
    "meter_commissioning_initial_credit_kwh" real DEFAULT '0'::real NOT NULL,
    "is_generation_managed_by_nxt_grid" boolean DEFAULT true NOT NULL,
    "location_geom" "extensions"."geometry"(Point,4326),
    "telegram_config" "jsonb" DEFAULT '{}'::"jsonb",
    "feature_access_config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);

ALTER TABLE "public"."grids" OWNER TO "postgres";

CREATE SEQUENCE IF NOT EXISTS "public"."grids_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."grids_id_seq" OWNER TO "postgres";

ALTER SEQUENCE "public"."grids_id_seq" OWNED BY "public"."grids"."id";

CREATE TABLE IF NOT EXISTS "public"."issues" (
    "id" integer NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "issue_type" "public"."issue_type_enum" NOT NULL,
    "issue_status" "public"."issue_status_enum" DEFAULT 'OPEN'::"public"."issue_status_enum" NOT NULL,
    "external_system" "public"."external_system_enum" DEFAULT 'JIRA'::"public"."external_system_enum" NOT NULL,
    "snoozed_until" timestamp with time zone,
    "started_at" timestamp(3) with time zone,
    "closed_at" timestamp(3) with time zone,
    "estimated_lost_revenue" double precision DEFAULT '0'::double precision NOT NULL,
    "external_reference" character varying,
    "meter_id" integer,
    "mppt_id" integer,
    "grid_id" integer,
    "rls_organization_id" integer
);

ALTER TABLE "public"."issues" OWNER TO "postgres";

CREATE SEQUENCE IF NOT EXISTS "public"."issues_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."issues_id_seq" OWNER TO "postgres";

ALTER SEQUENCE "public"."issues_id_seq" OWNED BY "public"."issues"."id";

ALTER TABLE "public"."lorawan_directives" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."lorawan_directives_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."member_feature" (
    "member_id" integer NOT NULL,
    "feature_id" integer NOT NULL
);

ALTER TABLE "public"."member_feature" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."members" (
    "id" integer NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "subscribed_to_telegram_revenue_notifications" boolean DEFAULT false NOT NULL,
    "member_type" "public"."member_type_enum" DEFAULT 'DEVELOPER'::"public"."member_type_enum" NOT NULL,
    "account_id" integer,
    "busy_commissioning_id" integer,
    "training_level" smallint DEFAULT '0'::smallint NOT NULL,
    "rls_organization_id" integer,
    "hidden" boolean DEFAULT false NOT NULL
);

ALTER TABLE "public"."members" OWNER TO "postgres";

CREATE SEQUENCE IF NOT EXISTS "public"."members_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."members_id_seq" OWNER TO "postgres";

ALTER SEQUENCE "public"."members_id_seq" OWNED BY "public"."members"."id";

CREATE TABLE IF NOT EXISTS "public"."meter_commissionings" (
    "id" integer NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "meter_commissioning_status" "public"."meter_commissioning_status_enum" DEFAULT 'PROCESSING'::"public"."meter_commissioning_status_enum" NOT NULL,
    "initialised_steps" integer,
    "pending_steps" integer,
    "processing_steps" integer,
    "successful_steps" integer,
    "failed_steps" integer,
    "total_steps" integer,
    "lock_session" character varying,
    "metering_hardware_install_session_id" integer,
    "rls_organization_id" integer
);

ALTER TABLE "public"."meter_commissionings" OWNER TO "postgres";

CREATE SEQUENCE IF NOT EXISTS "public"."meter_commissionings_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."meter_commissionings_id_seq" OWNER TO "postgres";

ALTER SEQUENCE "public"."meter_commissionings_id_seq" OWNED BY "public"."meter_commissionings"."id";

CREATE TABLE IF NOT EXISTS "public"."meter_credit_transfers" (
    "id" integer NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "lock_session" character varying,
    "amount" double precision NOT NULL,
    "meter_credit_transfer_status" "public"."meter_credit_transfer_status_enum" DEFAULT 'PENDING'::"public"."meter_credit_transfer_status_enum" NOT NULL,
    "sender_meter_set_to_amount" double precision,
    "currency" "public"."currency_enum" NOT NULL,
    "sender_meter_id" integer NOT NULL,
    "receiver_meter_id" integer NOT NULL,
    "author_id" integer,
    "rls_organization_id" integer
);

ALTER TABLE "public"."meter_credit_transfers" OWNER TO "postgres";

CREATE SEQUENCE IF NOT EXISTS "public"."meter_credit_transfers_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."meter_credit_transfers_id_seq" OWNER TO "postgres";

ALTER SEQUENCE "public"."meter_credit_transfers_id_seq" OWNED BY "public"."meter_credit_transfers"."id";

CREATE TABLE IF NOT EXISTS "public"."meter_interactions" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "meter_id" integer NOT NULL,
    "token" "text",
    "order_id" integer,
    "transactive_kwh" real,
    "target_power_limit" integer,
    "result_value" "jsonb",
    "meter_interaction_type" "public"."meter_interaction_type_enum" NOT NULL,
    "meter_interaction_status" "public"."meter_interaction_status_enum" DEFAULT 'QUEUED'::"public"."meter_interaction_status_enum" NOT NULL,
    "process_meta" "jsonb"
);

ALTER TABLE "public"."meter_interactions" OWNER TO "postgres";

ALTER TABLE "public"."meter_interactions" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."meter_interactions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."metering_hardware_imports" (
    "id" integer NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "metering_hardware_import_operation" "public"."mhi_operation_enum" DEFAULT 'ADD'::"public"."mhi_operation_enum" NOT NULL,
    "metering_hardware_import_status" "public"."mhi_status_enum" DEFAULT 'PENDING'::"public"."mhi_status_enum" NOT NULL,
    "metering_hardware_install_session_id" integer,
    "lock_session" character varying,
    "rls_organization_id" integer
);

ALTER TABLE "public"."metering_hardware_imports" OWNER TO "postgres";

CREATE SEQUENCE IF NOT EXISTS "public"."metering_hardware_imports_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."metering_hardware_imports_id_seq" OWNER TO "postgres";

ALTER SEQUENCE "public"."metering_hardware_imports_id_seq" OWNED BY "public"."metering_hardware_imports"."id";

CREATE TABLE IF NOT EXISTS "public"."metering_hardware_install_sessions" (
    "id" integer NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "dcu_id" integer,
    "meter_id" integer,
    "author_id" integer,
    "last_meter_commissioning_id" integer,
    "last_metering_hardware_import_id" integer,
    "rls_organization_id" integer
);

ALTER TABLE "public"."metering_hardware_install_sessions" OWNER TO "postgres";

CREATE SEQUENCE IF NOT EXISTS "public"."metering_hardware_install_sessions_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."metering_hardware_install_sessions_id_seq" OWNER TO "postgres";

ALTER SEQUENCE "public"."metering_hardware_install_sessions_id_seq" OWNED BY "public"."metering_hardware_install_sessions"."id";

CREATE SEQUENCE IF NOT EXISTS "public"."meters_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."meters_id_seq" OWNER TO "postgres";

ALTER SEQUENCE "public"."meters_id_seq" OWNED BY "public"."meters"."id";

CREATE OR REPLACE VIEW "public"."meters_with_account_and_statuses" WITH ("security_invoker"='true') AS
 SELECT "m"."id",
    "m"."created_at",
    "m"."external_reference",
    "m"."deleted_at",
    "m"."balance",
    "m"."balance_updated_at",
    "m"."kwh_credit_available",
    "m"."kwh_credit_available_updated_at",
    "m"."last_non_zero_consumption_at",
    "m"."is_on",
    "m"."should_be_on",
    "m"."is_on_updated_at",
    "m"."should_be_on_updated_at",
    "m"."is_manual_mode_on",
    "m"."is_manual_mode_on_updated_at",
    "m"."voltage",
    "m"."voltage_updated_at",
    "m"."power",
    "m"."power_updated_at",
    "m"."latitude",
    "m"."longitude",
    "m"."coord_accuracy",
    "m"."power_limit",
    "m"."power_limit_updated_at",
    "m"."power_limit_should_be",
    "m"."power_down_count",
    "m"."power_down_count_updated_at",
    "m"."power_limit_should_be_updated_at",
    "m"."is_starred",
    "m"."external_system",
    "m"."meter_type",
    "m"."nickname",
    "m"."last_seen_at",
    "m"."issue_check_execution_session",
    "m"."issue_check_last_run_at",
    "m"."pole_id",
    "m"."meter_phase",
    "m"."last_metering_hardware_install_session_id",
    "m"."kwh_tariff",
    "m"."watchdog_session",
    "m"."watchdog_last_run_at",
    "m"."version",
    "m"."is_simulated",
    "m"."power_limit_hps_mode",
    "m"."current_special_status",
    "m"."communication_protocol",
    "m"."is_cabin_meter",
    "m"."last_encountered_issue_id",
    "m"."connection_id",
    "m"."dcu_id",
    "m"."decoder_key",
    "m"."last_sts_token_issued_at",
    "m"."rls_grid_id",
    "m"."rls_organization_id",
    "m"."is_test_mode_on",
    "m"."pulse_counter_kwh",
    "m"."device_id",
    "c"."grid_id",
    "c"."is_hidden_from_reporting",
    "a"."full_name",
    "a"."phone",
    (
        CASE
            WHEN ("m"."last_metering_hardware_install_session_id" IS NULL) THEN 'SUCCESSFUL'::"text"
            WHEN (("i"."metering_hardware_import_status" = 'PENDING'::"public"."mhi_status_enum") OR ("com"."meter_commissioning_status" = 'PENDING'::"public"."meter_commissioning_status_enum")) THEN 'PENDING'::"text"
            WHEN (("i"."metering_hardware_import_status" = 'PROCESSING'::"public"."mhi_status_enum") OR ("com"."meter_commissioning_status" = 'PROCESSING'::"public"."meter_commissioning_status_enum")) THEN 'PROCESSING'::"text"
            WHEN ("com"."meter_commissioning_status" = 'SUCCESSFUL'::"public"."meter_commissioning_status_enum") THEN 'SUCCESSFUL'::"text"
            WHEN (("i"."metering_hardware_import_status" = 'FAILED'::"public"."mhi_status_enum") OR ("com"."meter_commissioning_status" = 'FAILED'::"public"."meter_commissioning_status_enum") OR (("i"."metering_hardware_import_status" = 'SUCCESSFUL'::"public"."mhi_status_enum") AND ("com"."meter_commissioning_status" IS NULL))) THEN 'FAILED'::"text"
            ELSE NULL::"text"
        END)::"public"."mhi_status_enum" AS "install_status",
        CASE
            WHEN ("iss"."issue_status" = 'OPEN'::"public"."issue_status_enum") THEN "iss"."issue_type"
            ELSE NULL::"public"."issue_type_enum"
        END AS "open_issue"
   FROM ((((((("public"."meters" "m"
     JOIN "public"."connections" "conn" ON (("m"."connection_id" = "conn"."id")))
     JOIN "public"."customers" "c" ON (("conn"."customer_id" = "c"."id")))
     JOIN "public"."accounts" "a" ON (("c"."account_id" = "a"."id")))
     LEFT JOIN "public"."metering_hardware_install_sessions" "install_session" ON (("m"."last_metering_hardware_install_session_id" = "install_session"."id")))
     LEFT JOIN "public"."metering_hardware_imports" "i" ON (("install_session"."last_metering_hardware_import_id" = "i"."id")))
     LEFT JOIN "public"."meter_commissionings" "com" ON (("install_session"."last_meter_commissioning_id" = "com"."id")))
     LEFT JOIN "public"."issues" "iss" ON (("m"."last_encountered_issue_id" = "iss"."id")));

ALTER TABLE "public"."meters_with_account_and_statuses" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."migrations" (
    "id" integer NOT NULL,
    "timestamp" bigint NOT NULL,
    "name" character varying NOT NULL
);

ALTER TABLE "public"."migrations" OWNER TO "postgres";

CREATE SEQUENCE IF NOT EXISTS "public"."migrations_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."migrations_id_seq" OWNER TO "postgres";

ALTER SEQUENCE "public"."migrations_id_seq" OWNED BY "public"."migrations"."id";

CREATE TABLE IF NOT EXISTS "public"."mppts" (
    "id" integer NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "external_reference" character varying NOT NULL,
    "external_id" character varying NOT NULL,
    "external_system" "public"."external_system_enum" DEFAULT 'VICTRON'::"public"."external_system_enum" NOT NULL,
    "kw" double precision,
    "azimuth" double precision,
    "tilt" double precision,
    "position_horizontal" character varying,
    "position_vertical" character varying,
    "installed_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL,
    "deleted_at" timestamp(3) with time zone,
    "mppt_type" "public"."mppt_type_enum" DEFAULT 'MPPT'::"public"."mppt_type_enum" NOT NULL,
    "grid_id" integer,
    "rls_organization_id" integer
);

ALTER TABLE "public"."mppts" OWNER TO "postgres";

CREATE SEQUENCE IF NOT EXISTS "public"."mppts_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."mppts_id_seq" OWNER TO "postgres";

ALTER SEQUENCE "public"."mppts_id_seq" OWNED BY "public"."mppts"."id";

CREATE TABLE IF NOT EXISTS "public"."notes" (
    "id" integer NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "message" character varying,
    "customer_id" integer,
    "connection_id" integer,
    "meter_id" integer,
    "author_id" integer,
    "rls_organization_id" integer
);

ALTER TABLE "public"."notes" OWNER TO "postgres";

CREATE SEQUENCE IF NOT EXISTS "public"."notes_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."notes_id_seq" OWNER TO "postgres";

ALTER SEQUENCE "public"."notes_id_seq" OWNED BY "public"."notes"."id";

CREATE TABLE IF NOT EXISTS "public"."notification_parameters" (
    "id" integer NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "parameters" "json"
);

ALTER TABLE "public"."notification_parameters" OWNER TO "postgres";

CREATE SEQUENCE IF NOT EXISTS "public"."notification_parameters_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."notification_parameters_id_seq" OWNER TO "postgres";

ALTER SEQUENCE "public"."notification_parameters_id_seq" OWNED BY "public"."notification_parameters"."id";

CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" integer NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "connector_external_system" "public"."external_system_enum",
    "carrier_external_system" "public"."external_system_enum",
    "notification_type" "public"."notification_type_enum" NOT NULL,
    "notification_status" "public"."notification_status_enum" NOT NULL,
    "external_reference" character varying,
    "notification_parameter_id" integer,
    "grid_id" integer,
    "organization_id" integer,
    "account_id" integer,
    "lock_session" character varying,
    "message" character varying,
    "phone" character varying,
    "subject" character varying,
    "email" character varying,
    "chat_id" character varying,
    "thread_id" character varying
);

ALTER TABLE "public"."notifications" OWNER TO "postgres";

CREATE SEQUENCE IF NOT EXISTS "public"."notifications_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."notifications_id_seq" OWNER TO "postgres";

ALTER SEQUENCE "public"."notifications_id_seq" OWNED BY "public"."notifications"."id";

CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" integer NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "amount" double precision NOT NULL,
    "order_status" "public"."order_status_enum" DEFAULT 'PENDING'::"public"."order_status_enum" NOT NULL,
    "lock_session" character varying,
    "external_reference" character varying,
    "currency" "public"."currency_enum" NOT NULL,
    "external_system" "public"."external_system_enum",
    "tariff_type" "public"."meter_type_enum",
    "tariff" double precision DEFAULT '-1'::double precision NOT NULL,
    "payment_method" "public"."payment_method_enum",
    "payment_channel" "public"."payment_channel_enum",
    "author_id" integer,
    "directive_id" bigint,
    "meter_credit_transfer_id" integer,
    "historical_grid_id" integer,
    "meta_author_type" "public"."account_type_enum",
    "meta_author_name" character varying,
    "meta_author_id" integer,
    "meta_order_type" "public"."order_type_enum",
    "meta_sender_id" integer,
    "meta_sender_name" character varying,
    "meta_receiver_name" character varying,
    "meta_receiver_name_part_2" character varying,
    "meta_sender_name_part_2" character varying,
    "meta_receiver_id" integer,
    "meta_sender_type" "public"."order_actor_type_enum",
    "meta_receiver_type" "public"."order_actor_type_enum",
    "meta_is_hidden_from_reporting" boolean,
    "sender_wallet_id" integer,
    "receiver_wallet_id" integer,
    "ussd_session_id" integer,
    "lorawan_directive_id" bigint,
    "meta_receiver_id_part_2" integer,
    "rls_organization_id" integer,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."orders" OWNER TO "postgres";

CREATE SEQUENCE IF NOT EXISTS "public"."orders_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."orders_id_seq" OWNER TO "postgres";

ALTER SEQUENCE "public"."orders_id_seq" OWNED BY "public"."orders"."id";

CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" integer NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "name" character varying NOT NULL,
    "formal_name" character varying,
    "email" character varying,
    "phone" character varying,
    "address" character varying,
    "epicollect_contract_survey_slug" character varying,
    "epicollect_contract_survey_secret" character varying,
    "epicollect_contract_survey_client_id" character varying,
    "epicollect_contract_last_sync_at" timestamp(3) with time zone,
    "developer_group_telegram_chat_id" character varying,
    "deleted_at" timestamp with time zone,
    "pd_hero_google_drive_folder_id" "text",
    "organization_type" "public"."organization_type_enum" DEFAULT 'SOLAR_DEVELOPER'::"public"."organization_type_enum" NOT NULL
);

ALTER TABLE "public"."organizations" OWNER TO "postgres";

CREATE SEQUENCE IF NOT EXISTS "public"."organizations_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."organizations_id_seq" OWNER TO "postgres";

ALTER SEQUENCE "public"."organizations_id_seq" OWNED BY "public"."organizations"."id";

CREATE TABLE IF NOT EXISTS "public"."payouts" (
    "id" integer NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "proposed_amount" double precision NOT NULL,
    "approved_amount" double precision,
    "external_reference" character varying,
    "external_system" "public"."external_system_enum",
    "payout_status" "public"."payout_status_enum" NOT NULL,
    "draft_link" character varying,
    "started_at" timestamp(3) with time zone NOT NULL,
    "ended_at" timestamp(3) with time zone NOT NULL,
    "grid_id" integer NOT NULL,
    "details" "json",
    "bank_account_id" integer,
    "approved_by_account_id" integer
);

ALTER TABLE "public"."payouts" OWNER TO "postgres";

CREATE SEQUENCE IF NOT EXISTS "public"."payouts_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."payouts_id_seq" OWNER TO "postgres";

ALTER SEQUENCE "public"."payouts_id_seq" OWNED BY "public"."payouts"."id";

CREATE TABLE IF NOT EXISTS "public"."pd_action_templates" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "pd_flow_template_id" bigint NOT NULL,
    "pd_action_type" "public"."pd_action_type_enum" NOT NULL,
    "depends_on" "jsonb" DEFAULT '[]'::"jsonb",
    "key" "text",
    "pd_document_template_id" bigint,
    "parameters" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);

ALTER TABLE "public"."pd_action_templates" OWNER TO "postgres";

ALTER TABLE "public"."pd_action_templates" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."pd_action_templates_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."pd_actions" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "pd_action_status" "public"."pd_action_status_enum" DEFAULT 'GENERATING'::"public"."pd_action_status_enum" NOT NULL,
    "pd_action_type" "public"."pd_action_type_enum" NOT NULL,
    "depends_on" "jsonb" DEFAULT '[]'::"jsonb",
    "pd_flow_id" bigint,
    "pd_section_id" bigint,
    "latest_pd_document_id" bigint,
    "key" "text",
    "parameters" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "pd_action_template_id" bigint
);

ALTER TABLE "public"."pd_actions" OWNER TO "postgres";

ALTER TABLE "public"."pd_actions" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."pd_actions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."pd_audits" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "author_id" integer,
    "message" "text",
    "pd_action_id" bigint
);

ALTER TABLE "public"."pd_audits" OWNER TO "postgres";

ALTER TABLE "public"."pd_audits" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."pd_audits_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."pd_document_templates" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "google_drive_template_id" "text" NOT NULL,
    "title" "text",
    "parameters" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "pd_document_type" "public"."pd_document_type_enum"
);

ALTER TABLE "public"."pd_document_templates" OWNER TO "postgres";

ALTER TABLE "public"."pd_document_templates" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."pd_document_templates_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."pd_documents" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "pd_action_id" bigint,
    "google_drive_document_id" "text" NOT NULL,
    "title" "text",
    "pd_document_type" "public"."pd_document_type_enum"
);

ALTER TABLE "public"."pd_documents" OWNER TO "postgres";

ALTER TABLE "public"."pd_documents" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."pd_documents_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."pd_flow_templates" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "parameters" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);

ALTER TABLE "public"."pd_flow_templates" OWNER TO "postgres";

ALTER TABLE "public"."pd_flow_templates" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."pd_flow_templates_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."pd_flows" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "pd_flow_template_id" bigint NOT NULL,
    "google_folder_id" "text",
    "title" "text",
    "parameters" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);

ALTER TABLE "public"."pd_flows" OWNER TO "postgres";

ALTER TABLE "public"."pd_flows" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."pd_flows_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."pd_section_templates" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "title" character varying
);

ALTER TABLE "public"."pd_section_templates" OWNER TO "postgres";

ALTER TABLE "public"."pd_section_templates" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."pd_section_templates_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."pd_sections" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "title" "text"
);

ALTER TABLE "public"."pd_sections" OWNER TO "postgres";

ALTER TABLE "public"."pd_sections" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."pd_sections_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."pd_site_submissions" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "author_full_name" "text" NOT NULL,
    "author_email" "text" NOT NULL,
    "author_organization_name" "text" NOT NULL,
    "site_name" character varying NOT NULL,
    "site_details" "jsonb" NOT NULL,
    "outline_geom" "extensions"."geometry"(Polygon,4326),
    "deleted_at" timestamp with time zone,
    "location_geom" "extensions"."geometry"(Point,4326),
    "organization_id" integer,
    "author_organization_id" integer,
    "buildings_geo_flat" "jsonb",
    "distribution_geo_flat" "jsonb",
    "meta_geo_flat" "jsonb",
    "poles_geo_flat" "jsonb"
);

ALTER TABLE "public"."pd_site_submissions" OWNER TO "postgres";

ALTER TABLE "public"."pd_site_submissions" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."pd_site_submissions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."pd_sites" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "organization_id" integer,
    "name" "text" NOT NULL,
    "deleted_at" timestamp with time zone,
    "location_geom" "extensions"."geometry"(Point,4326),
    "outline_geom" "extensions"."geometry"(Polygon,4326),
    "pd_flow_id" bigint,
    "operations_grid_id" integer
);

ALTER TABLE "public"."pd_sites" OWNER TO "postgres";

ALTER TABLE "public"."pd_sites" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."pd_sites_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE SEQUENCE IF NOT EXISTS "public"."poles_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."poles_id_seq" OWNER TO "postgres";

ALTER SEQUENCE "public"."poles_id_seq" OWNED BY "public"."poles"."id";

CREATE TABLE IF NOT EXISTS "public"."routers" (
    "id" integer NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "external_reference" character varying NOT NULL,
    "external_system" "public"."external_system_enum" DEFAULT 'ZEROTIER'::"public"."external_system_enum" NOT NULL,
    "is_online" boolean DEFAULT false NOT NULL,
    "is_online_updated_at" timestamp(3) with time zone,
    "deleted_at" timestamp(3) with time zone,
    "grid_id" integer,
    "rls_organization_id" integer
);

ALTER TABLE "public"."routers" OWNER TO "postgres";

CREATE SEQUENCE IF NOT EXISTS "public"."routers_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."routers_id_seq" OWNER TO "postgres";

ALTER SEQUENCE "public"."routers_id_seq" OWNED BY "public"."routers"."id";

CREATE TABLE IF NOT EXISTS "public"."solcast_cache" (
    "id" integer NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "request_type" "public"."solcast_cache_request_type_enum" NOT NULL,
    "latitude" numeric(8,6) NOT NULL,
    "longitude" numeric(9,6) NOT NULL,
    "tilt" numeric(10,3) NOT NULL,
    "azimuth" numeric(10,3) NOT NULL,
    "capacity_kwp" numeric(10,3) NOT NULL,
    "install_date" character varying NOT NULL,
    "response" "text" NOT NULL
);

ALTER TABLE "public"."solcast_cache" OWNER TO "postgres";

CREATE SEQUENCE IF NOT EXISTS "public"."solcast_cache_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."solcast_cache_id_seq" OWNER TO "postgres";

ALTER SEQUENCE "public"."solcast_cache_id_seq" OWNED BY "public"."solcast_cache"."id";

CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" bigint NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "amount" double precision NOT NULL,
    "transaction_status" "public"."transaction_status_enum" NOT NULL,
    "balance_before" double precision DEFAULT '-1'::double precision NOT NULL,
    "balance_after" double precision DEFAULT '-1'::double precision NOT NULL,
    "wallet_id" integer,
    "order_id" integer,
    "rls_organization_id" integer
);

ALTER TABLE "public"."transactions" OWNER TO "postgres";

CREATE SEQUENCE IF NOT EXISTS "public"."transactions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."transactions_id_seq" OWNER TO "postgres";

ALTER SEQUENCE "public"."transactions_id_seq" OWNED BY "public"."transactions"."id";

CREATE TABLE IF NOT EXISTS "public"."ussd_session_hops" (
    "id" integer NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "text" character varying,
    "phone" character varying,
    "network_code" character varying,
    "service_code" character varying,
    "ussd_session_id" integer
);

ALTER TABLE "public"."ussd_session_hops" OWNER TO "postgres";

CREATE SEQUENCE IF NOT EXISTS "public"."ussd_session_hops_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."ussd_session_hops_id_seq" OWNER TO "postgres";

ALTER SEQUENCE "public"."ussd_session_hops_id_seq" OWNED BY "public"."ussd_session_hops"."id";

CREATE TABLE IF NOT EXISTS "public"."ussd_sessions" (
    "id" integer NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "phone" character varying NOT NULL,
    "amount" double precision,
    "external_reference" character varying,
    "external_system" "public"."external_system_enum" NOT NULL,
    "is_using_other_option" boolean DEFAULT false NOT NULL,
    "account_id" integer,
    "meter_id" integer,
    "bank_id" integer
);

ALTER TABLE "public"."ussd_sessions" OWNER TO "postgres";

CREATE SEQUENCE IF NOT EXISTS "public"."ussd_sessions_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."ussd_sessions_id_seq" OWNER TO "postgres";

ALTER SEQUENCE "public"."ussd_sessions_id_seq" OWNED BY "public"."ussd_sessions"."id";

CREATE TABLE IF NOT EXISTS "public"."wallets" (
    "id" integer NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT "now"() NOT NULL,
    "organization_id" integer,
    "agent_id" integer,
    "customer_id" integer,
    "meter_id" integer,
    "lock_session" character varying,
    "balance" double precision DEFAULT '0'::double precision NOT NULL,
    "balance_updated_at" timestamp(3) with time zone,
    "identifier" character varying,
    "wallet_type" "public"."wallet_type_enum" DEFAULT 'REAL'::"public"."wallet_type_enum" NOT NULL,
    "goldring_migration_id" integer,
    "connection_id" integer,
    "rls_organization_id" integer
);

ALTER TABLE "public"."wallets" OWNER TO "postgres";

CREATE SEQUENCE IF NOT EXISTS "public"."wallets_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."wallets_id_seq" OWNER TO "postgres";

ALTER SEQUENCE "public"."wallets_id_seq" OWNED BY "public"."wallets"."id";

ALTER TABLE ONLY "public"."accounts" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."accounts_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."agents" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."agents_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."api_keys" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."api_keys_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."audits" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."audits_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."bank_accounts" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."bank_accounts_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."banks" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."banks_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."connection_requested_meters" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."connection_requested_meters_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."connections" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."connections_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."customers" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."customers_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."dcus" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."dcus_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."directive_batch_executions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."directive_batch_executions_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."directive_batches" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."directive_batches_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."directive_watchdog_sessions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."directive_watchdog_sessions_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."directives" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."directives_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."energy_cabins" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."energy_cabins_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."features" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."features_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."grids" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."grids_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."issues" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."issues_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."members" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."members_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."meter_commissionings" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."meter_commissionings_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."meter_credit_transfers" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."meter_credit_transfers_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."metering_hardware_imports" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."metering_hardware_imports_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."metering_hardware_install_sessions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."metering_hardware_install_sessions_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."meters" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."meters_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."migrations" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."migrations_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."mppts" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."mppts_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."notes" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."notes_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."notification_parameters" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."notification_parameters_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."notifications" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."notifications_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."orders" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."orders_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."organizations" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."organizations_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."payouts" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."payouts_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."poles" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."poles_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."routers" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."routers_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."solcast_cache" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."solcast_cache_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."transactions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."transactions_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."ussd_session_hops" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."ussd_session_hops_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."ussd_sessions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."ussd_sessions_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."wallets" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."wallets_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."connections"
    ADD CONSTRAINT "PK_0a1f844af3122354cbd487a8d03" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."meters"
    ADD CONSTRAINT "PK_0a71b52dbb545fa36efaf070583" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "PK_133ec679a801fab5e070f73d3ea" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."poles"
    ADD CONSTRAINT "PK_1f4336016e8de1d62acb05ce829" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "PK_28b53062261b996d9c99fa12404" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."member_feature"
    ADD CONSTRAINT "PK_2e0913be5216d601bf212e58fc9" PRIMARY KEY ("member_id", "feature_id");

ALTER TABLE ONLY "public"."notification_parameters"
    ADD CONSTRAINT "PK_338f36e72b69406bed36e054e09" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."directives"
    ADD CONSTRAINT "PK_33cbab4c60a227ae4053fcaea3c" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."banks"
    ADD CONSTRAINT "PK_3975b5f684ec241e3901db62d77" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."metering_hardware_install_sessions"
    ADD CONSTRAINT "PK_4eb998262e5c773a89dfe3ea0e1" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."ussd_session_hops"
    ADD CONSTRAINT "PK_56d984bae21ce6e86848a8a3c04" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."energy_cabins"
    ADD CONSTRAINT "PK_59ecb7965974e45fdc2f243bda7" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "PK_5a7a02c20412299d198e097a8fe" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."features"
    ADD CONSTRAINT "PK_5c1e336df2f4a7051e5bf08a941" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."api_keys"
    ADD CONSTRAINT "PK_5c8a79801b44bd27b79228e1dad" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."metering_hardware_imports"
    ADD CONSTRAINT "PK_665b32b395a7675648ed77da4f6" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."meter_commissionings"
    ADD CONSTRAINT "PK_69fce91302a5dc8dd3db274717b" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "PK_6b031fcd0863e3f6b44230163f9" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."payouts"
    ADD CONSTRAINT "PK_76855dc4f0a6c18c72eea302e87" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."dcus"
    ADD CONSTRAINT "PK_82192607fa5119101a78fe53b7d" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."wallets"
    ADD CONSTRAINT "PK_8402e5df5a30a229380e83e4f7e" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."grids"
    ADD CONSTRAINT "PK_840d40fdcde1e935afd43082aca" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."meter_credit_transfers"
    ADD CONSTRAINT "PK_8ad697d3bf35e128cf01874b202" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."migrations"
    ADD CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."directive_batches"
    ADD CONSTRAINT "PK_92d424811a3fd49a8020eadb97a" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."directive_batch_executions"
    ADD CONSTRAINT "PK_9494ab23abdfe4e59f3f29842d5" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."agents"
    ADD CONSTRAINT "PK_9c653f28ae19c5884d5baf6a1d9" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."issues"
    ADD CONSTRAINT "PK_9d8ecbbeff46229c700f0449257" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."solcast_cache"
    ADD CONSTRAINT "PK_a0b1d6bdbc5ca0056201a1c6dd0" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "PK_a219afd8dd77ed80f5a862f1db9" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."notes"
    ADD CONSTRAINT "PK_af6206538ea96c4e77e9f400c3d" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."audits"
    ADD CONSTRAINT "PK_b2d7a2089999197dc7024820f28" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."routers"
    ADD CONSTRAINT "PK_b6d283f1e40d4942dedbc0cb27a" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."directive_watchdog_sessions"
    ADD CONSTRAINT "PK_c05de70ec36246cd4a4cfc01249" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."ussd_sessions"
    ADD CONSTRAINT "PK_c18f16f36e79b2fb87783476830" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."bank_accounts"
    ADD CONSTRAINT "PK_c872de764f2038224a013ff25ed" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."mppts"
    ADD CONSTRAINT "PK_c8a4dc57b932c173f6c579804c0" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."connection_requested_meters"
    ADD CONSTRAINT "PK_ef90f8d1aa3055757e0ff8e4aa7" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "REL_093ca3525311b8a12f6cf6b1c9" UNIQUE ("directive_id");

ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "REL_13bf998d703e7d4c7b9a90f4f7" UNIQUE ("supabase_id");

ALTER TABLE ONLY "public"."metering_hardware_install_sessions"
    ADD CONSTRAINT "REL_4eb64f5decb7250cfa993410c1" UNIQUE ("last_meter_commissioning_id");

ALTER TABLE ONLY "public"."meters"
    ADD CONSTRAINT "REL_5606d6ec5ab568377509edc526" UNIQUE ("last_encountered_issue_id");

ALTER TABLE ONLY "public"."wallets"
    ADD CONSTRAINT "REL_6580899a2293de27787376887f" UNIQUE ("customer_id");

ALTER TABLE ONLY "public"."meters"
    ADD CONSTRAINT "REL_86d4557a79e374b5c55cb3b66d" UNIQUE ("last_metering_hardware_install_session_id");

ALTER TABLE ONLY "public"."wallets"
    ADD CONSTRAINT "REL_8db1f4e4f8122bd25d50ad96b2" UNIQUE ("meter_id");

ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "REL_92081072063eaf51300ab6c267" UNIQUE ("ussd_session_id");

ALTER TABLE ONLY "public"."dcus"
    ADD CONSTRAINT "REL_9334b587e6e5291f8ccd1b11c4" UNIQUE ("last_metering_hardware_install_session_id");

ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "REL_a53c58bdb5ae0193f17497c81b" UNIQUE ("meter_credit_transfer_id");

ALTER TABLE ONLY "public"."metering_hardware_install_sessions"
    ADD CONSTRAINT "REL_be64a09dc738420a409cb96026" UNIQUE ("last_metering_hardware_import_id");

ALTER TABLE ONLY "public"."agents"
    ADD CONSTRAINT "REL_df520decc9e003a843d8edd986" UNIQUE ("account_id");

ALTER TABLE ONLY "public"."wallets"
    ADD CONSTRAINT "REL_e63e504d8e35ef37a2c56b75eb" UNIQUE ("connection_id");

ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "REL_ebcc29963874e55053e8ee80be" UNIQUE ("account_id");

ALTER TABLE ONLY "public"."wallets"
    ADD CONSTRAINT "REL_f499c61c6d6a0ac3f794d966ed" UNIQUE ("organization_id");

ALTER TABLE ONLY "public"."wallets"
    ADD CONSTRAINT "REL_f5782e05e8688f0cfbb5c4a52c" UNIQUE ("agent_id");

ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "REL_fd9dfb97e21b75fc45d42aa614" UNIQUE ("account_id");

ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "UQ_0ec8c228e89a95aeb4af9ee3226" UNIQUE ("telegram_link_token");

ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "UQ_3ffa9ce30e56b6d2abf0a465f5f" UNIQUE ("telegram_id");

ALTER TABLE ONLY "public"."features"
    ADD CONSTRAINT "UQ_49b9cdf3c7de1a95941e7187764" UNIQUE ("uuid");

ALTER TABLE ONLY "public"."grids"
    ADD CONSTRAINT "UQ_61f08f04c9f0f1d3afd24b9be0b" UNIQUE ("identifier");

ALTER TABLE ONLY "public"."poles"
    ADD CONSTRAINT "UQ_67112e4334d7090a571d2fff42a" UNIQUE ("external_reference");

ALTER TABLE ONLY "public"."api_keys"
    ADD CONSTRAINT "UQ_e42cf55faeafdcce01a82d24849" UNIQUE ("key");

ALTER TABLE ONLY "public"."autopilot_executions"
    ADD CONSTRAINT "autopilot_executions_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."device_logs"
    ADD CONSTRAINT "device_logs_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."device_types"
    ADD CONSTRAINT "device_types_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."lorawan_directives"
    ADD CONSTRAINT "lorawan_directives_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."meter_interactions"
    ADD CONSTRAINT "meter_interactions_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."meters"
    ADD CONSTRAINT "meters_device_id_key" UNIQUE ("device_id");

ALTER TABLE ONLY "public"."pd_action_templates"
    ADD CONSTRAINT "pd_action_templates_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."pd_actions"
    ADD CONSTRAINT "pd_actions_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."pd_audits"
    ADD CONSTRAINT "pd_audits_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."pd_document_templates"
    ADD CONSTRAINT "pd_document_templates_google_drive_template_id_key" UNIQUE ("google_drive_template_id");

ALTER TABLE ONLY "public"."pd_document_templates"
    ADD CONSTRAINT "pd_document_templates_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."pd_documents"
    ADD CONSTRAINT "pd_documents_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."pd_flow_templates"
    ADD CONSTRAINT "pd_flow_templates_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."pd_flows"
    ADD CONSTRAINT "pd_flows_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."pd_site_submissions"
    ADD CONSTRAINT "pd_public_submissions_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."pd_section_templates"
    ADD CONSTRAINT "pd_section_templates_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."pd_sections"
    ADD CONSTRAINT "pd_sections_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."pd_sites"
    ADD CONSTRAINT "pd_sites_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."pd_action_templates"
    ADD CONSTRAINT "unique_pd_action_templates_key" UNIQUE ("pd_flow_template_id", "key");

ALTER TABLE ONLY "public"."pd_actions"
    ADD CONSTRAINT "unique_pd_actions_key" UNIQUE ("pd_flow_id", "key");

CREATE INDEX "IDX_006cef4b555e8b1069cb7236db" ON "public"."directives" USING "btree" ("meter_id", "directive_status", "created_at");

CREATE INDEX "IDX_14f6e0badc019bbdd2f66f7e8a" ON "public"."notifications" USING "btree" ("notification_status");

CREATE INDEX "IDX_354415e311ebb83a9dfa662051" ON "public"."directives" USING "btree" ("execution_session");

CREATE UNIQUE INDEX "IDX_36d092cd2d89756f62421011bb" ON "public"."meters" USING "btree" ("external_reference", "external_system");

CREATE INDEX "IDX_4c8f70f01a77b717b9659b564d" ON "public"."directives" USING "btree" ("directive_status");

CREATE INDEX "IDX_4da956d70d1de38087b251b997" ON "public"."member_feature" USING "btree" ("feature_id");

CREATE INDEX "IDX_5c820aa56824815f8e19484ff5" ON "public"."transactions" USING "btree" ("wallet_id", "transaction_status", "created_at");

CREATE INDEX "IDX_5d97e33fcf9b08d7a748d9128f" ON "public"."meters" USING "btree" ("dcu_id", "connection_id");

CREATE UNIQUE INDEX "IDX_9c4f5693f52e6e5e51e1ca05af" ON "public"."dcus" USING "btree" ("external_reference", "external_system");

CREATE INDEX "IDX_c312f698867204bf4f1fd149c9" ON "public"."member_feature" USING "btree" ("member_id");

CREATE INDEX "IDX_df09009e4a41315a462745d2c8" ON "public"."directives" USING "btree" ("token");

CREATE INDEX "idx_agents_rls_organization_id" ON "public"."agents" USING "btree" ("rls_organization_id");

CREATE INDEX "idx_connection_requested_meters_rls_organization_id" ON "public"."connection_requested_meters" USING "btree" ("rls_organization_id");

CREATE INDEX "idx_connections_rls_organization_id" ON "public"."connections" USING "btree" ("rls_organization_id");

CREATE INDEX "idx_customers_rls_organization_id" ON "public"."customers" USING "btree" ("rls_organization_id");

CREATE INDEX "idx_dcus_rls_organization_id" ON "public"."dcus" USING "btree" ("rls_organization_id");

CREATE INDEX "idx_directive_batch_executions_rls_organization_id" ON "public"."directive_batch_executions" USING "btree" ("rls_organization_id");

CREATE INDEX "idx_directive_batches_rls_organization_id" ON "public"."directive_batches" USING "btree" ("rls_organization_id");

CREATE INDEX "idx_directives_rls_organization_id" ON "public"."directives" USING "btree" ("rls_organization_id");

CREATE INDEX "idx_energy_cabins_location_geom" ON "public"."energy_cabins" USING "gist" ("location_geom");

CREATE INDEX "idx_energy_cabins_rls_organization_id" ON "public"."energy_cabins" USING "btree" ("rls_organization_id");

CREATE INDEX "idx_issues_open" ON "public"."issues" USING "btree" ("rls_organization_id", "meter_id", "created_at" DESC) WHERE ("issue_status" = 'OPEN'::"public"."issue_status_enum");

CREATE INDEX "idx_issues_rls_organization_id" ON "public"."issues" USING "btree" ("rls_organization_id");

CREATE INDEX "idx_lorawan_directives_rls_organization_id" ON "public"."lorawan_directives" USING "btree" ("rls_organization_id");

CREATE INDEX "idx_members_rls_organization_id" ON "public"."members" USING "btree" ("rls_organization_id");

CREATE INDEX "idx_meter_commissionings_rls_organization_id" ON "public"."meter_commissionings" USING "btree" ("rls_organization_id");

CREATE INDEX "idx_meter_credit_transfers_rls_organization_id" ON "public"."meter_credit_transfers" USING "btree" ("rls_organization_id");

CREATE INDEX "idx_metering_hardware_install_sessions_rls_organization_id" ON "public"."metering_hardware_install_sessions" USING "btree" ("rls_organization_id");

CREATE INDEX "idx_meters_rls_organization_id" ON "public"."meters" USING "btree" ("rls_organization_id");

CREATE INDEX "idx_mppts_rls_organization_id" ON "public"."mppts" USING "btree" ("rls_organization_id");

CREATE INDEX "idx_notes_rls_organization_id" ON "public"."notes" USING "btree" ("rls_organization_id");

CREATE INDEX "idx_orders_energy_topup_grid" ON "public"."orders" USING "btree" ("historical_grid_id") WHERE ("meta_order_type" = 'ENERGY_TOPUP'::"public"."order_type_enum");

CREATE INDEX "idx_orders_energy_topup_receiver" ON "public"."orders" USING "btree" ("meta_receiver_id") WHERE ("meta_order_type" = 'ENERGY_TOPUP'::"public"."order_type_enum");

CREATE INDEX "idx_orders_historical_grid_id" ON "public"."orders" USING "btree" ("historical_grid_id");

CREATE INDEX "idx_orders_meta_receiver_id" ON "public"."orders" USING "btree" ("meta_receiver_id");

CREATE INDEX "idx_orders_order_optimized" ON "public"."orders" USING "btree" ("updated_at" DESC);

CREATE INDEX "idx_orders_rls_organization_id" ON "public"."orders" USING "btree" ("rls_organization_id");

CREATE INDEX "idx_orders_rls_sender_receiver" ON "public"."orders" USING "btree" ("meta_sender_type", "meta_sender_id", "meta_receiver_type", "meta_receiver_id");

CREATE INDEX "idx_pd_site_submissions_location_geom" ON "public"."pd_site_submissions" USING "gist" ("location_geom");

CREATE INDEX "idx_pd_site_submissions_outline_geom" ON "public"."pd_site_submissions" USING "gist" ("outline_geom");

CREATE INDEX "idx_pd_sites_location_geom" ON "public"."pd_sites" USING "gist" ("location_geom");

CREATE INDEX "idx_pd_sites_outline_geom" ON "public"."pd_sites" USING "gist" ("outline_geom");

CREATE INDEX "idx_poles_location_geom" ON "public"."poles" USING "gist" ("location_geom");

CREATE INDEX "idx_poles_rls_organization_id" ON "public"."poles" USING "btree" ("rls_organization_id");

CREATE INDEX "idx_routers_rls_organization_id" ON "public"."routers" USING "btree" ("rls_organization_id");

CREATE INDEX "idx_transactions_rls_organization_id" ON "public"."transactions" USING "btree" ("rls_organization_id");

CREATE INDEX "idx_wallets_rls_organization_id" ON "public"."wallets" USING "btree" ("rls_organization_id");

CREATE OR REPLACE TRIGGER "append_rls_organization_id_by_device_id" BEFORE INSERT ON "public"."device_logs" FOR EACH ROW EXECUTE FUNCTION "public"."append_rls_organization_id_by_device_id"();

CREATE OR REPLACE TRIGGER "append_rls_organization_id_on_agent_insert" BEFORE INSERT ON "public"."agents" FOR EACH ROW EXECUTE FUNCTION "public"."append_rls_organization_id_by_grid_id"();

CREATE OR REPLACE TRIGGER "append_rls_organization_id_on_connection_insert" BEFORE INSERT ON "public"."connections" FOR EACH ROW EXECUTE FUNCTION "public"."append_rls_organization_id_by_customer_id"();

CREATE OR REPLACE TRIGGER "append_rls_organization_id_on_customer_insert" BEFORE INSERT ON "public"."customers" FOR EACH ROW EXECUTE FUNCTION "public"."append_rls_organization_id_by_grid_id"();

CREATE OR REPLACE TRIGGER "append_rls_organization_id_on_dcus_insert" BEFORE INSERT ON "public"."dcus" FOR EACH ROW EXECUTE FUNCTION "public"."append_rls_organization_id_by_grid_id"();

CREATE OR REPLACE TRIGGER "append_rls_organization_id_on_devices_insert" BEFORE INSERT ON "public"."devices" FOR EACH ROW EXECUTE FUNCTION "public"."append_rls_organization_id_by_grid_id"();

CREATE OR REPLACE TRIGGER "append_rls_organization_id_on_directive_batch_execution_insert" BEFORE INSERT ON "public"."directive_batch_executions" FOR EACH ROW EXECUTE FUNCTION "public"."append_rls_organization_id_by_directive_batch_id"();

CREATE OR REPLACE TRIGGER "append_rls_organization_id_on_directive_batch_insert" BEFORE INSERT ON "public"."directive_batches" FOR EACH ROW EXECUTE FUNCTION "public"."append_rls_organization_id_by_grid_id"();

CREATE OR REPLACE TRIGGER "append_rls_organization_id_on_directive_insert" BEFORE INSERT ON "public"."directives" FOR EACH ROW EXECUTE FUNCTION "public"."append_rls_organization_id_by_meter_id"();

CREATE OR REPLACE TRIGGER "append_rls_organization_id_on_energy_cabin_insert" BEFORE INSERT ON "public"."energy_cabins" FOR EACH ROW EXECUTE FUNCTION "public"."append_rls_organization_id_by_grid_id"();

CREATE OR REPLACE TRIGGER "append_rls_organization_id_on_issue_insert" BEFORE INSERT ON "public"."issues" FOR EACH ROW EXECUTE FUNCTION "public"."append_rls_organization_id_by_meter_id"();

CREATE OR REPLACE TRIGGER "append_rls_organization_id_on_lorawan_directive_insert" BEFORE INSERT ON "public"."lorawan_directives" FOR EACH ROW EXECUTE FUNCTION "public"."append_rls_organization_id_by_meter_id"();

CREATE OR REPLACE TRIGGER "append_rls_organization_id_on_member_insert" BEFORE INSERT ON "public"."members" FOR EACH ROW EXECUTE FUNCTION "public"."append_rls_organization_id_by_account_id"();

CREATE OR REPLACE TRIGGER "append_rls_organization_id_on_meter_commissioning_insert" BEFORE INSERT ON "public"."meter_commissionings" FOR EACH ROW EXECUTE FUNCTION "public"."append_rls_organization_id_by_metering_hardware_install_session"();

CREATE OR REPLACE TRIGGER "append_rls_organization_id_on_meter_credit_transfer_insert" BEFORE INSERT ON "public"."meter_credit_transfers" FOR EACH ROW EXECUTE FUNCTION "public"."append_rls_organization_id_by_receiver_meter_id"();

CREATE OR REPLACE TRIGGER "append_rls_organization_id_on_meter_insert" BEFORE INSERT ON "public"."meters" FOR EACH ROW EXECUTE FUNCTION "public"."append_rls_organization_id_by_connection_id"();

CREATE OR REPLACE TRIGGER "append_rls_organization_id_on_meter_install_session_insert" BEFORE INSERT ON "public"."metering_hardware_install_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."append_rls_organization_id_by_dcu_id_or_meter_id"();

CREATE OR REPLACE TRIGGER "append_rls_organization_id_on_mppt_insert" BEFORE INSERT ON "public"."mppts" FOR EACH ROW EXECUTE FUNCTION "public"."append_rls_organization_id_by_grid_id"();

CREATE OR REPLACE TRIGGER "append_rls_organization_id_on_note_insert" BEFORE INSERT ON "public"."notes" FOR EACH ROW EXECUTE FUNCTION "public"."append_rls_organization_id_by_customer_id"();

CREATE OR REPLACE TRIGGER "append_rls_organization_id_on_pole_insert" BEFORE INSERT ON "public"."poles" FOR EACH ROW EXECUTE FUNCTION "public"."append_rls_organization_id_by_grid_id"();

CREATE OR REPLACE TRIGGER "append_rls_organization_id_on_requested_connection_meters_inser" BEFORE INSERT ON "public"."connection_requested_meters" FOR EACH ROW EXECUTE FUNCTION "public"."append_rls_organization_id_by_connection_id"();

CREATE OR REPLACE TRIGGER "append_rls_organization_id_on_route_insert" BEFORE INSERT ON "public"."routers" FOR EACH ROW EXECUTE FUNCTION "public"."append_rls_organization_id_by_grid_id"();

CREATE OR REPLACE TRIGGER "append_rls_organization_id_on_transaction_insert" BEFORE INSERT ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."append_rls_organization_id_by_order_id"();

CREATE OR REPLACE TRIGGER "append_rls_organization_id_on_wallet_insert" BEFORE INSERT ON "public"."wallets" FOR EACH ROW EXECUTE FUNCTION "public"."append_rls_organization_id_by_customer_id_or_agent_id_or_connec"();

CREATE OR REPLACE TRIGGER "notify_make_about_is_fs_on_updated" AFTER UPDATE ON "public"."grids" FOR EACH ROW EXECUTE FUNCTION "public"."notify_make_about_is_fs_on_updated"();

CREATE OR REPLACE TRIGGER "notify_make_about_is_hps_on_updated" AFTER UPDATE ON "public"."grids" FOR EACH ROW EXECUTE FUNCTION "public"."notify_make_about_is_hps_on_updated"();

CREATE OR REPLACE TRIGGER "notify_make_about_kwh_tariff_essential_service_updated" AFTER UPDATE ON "public"."grids" FOR EACH ROW EXECUTE FUNCTION "public"."notify_make_about_kwh_tariff_essential_service_updated"();

ALTER TABLE ONLY "public"."meters"
    ADD CONSTRAINT "FK_04e1a755d5b760f681e5205557d" FOREIGN KEY ("dcu_id") REFERENCES "public"."dcus"("id");

ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "FK_093ca3525311b8a12f6cf6b1c9b" FOREIGN KEY ("directive_id") REFERENCES "public"."directives"("id");

ALTER TABLE ONLY "public"."mppts"
    ADD CONSTRAINT "FK_0a681c1d6d0a67331bbc6956427" FOREIGN KEY ("grid_id") REFERENCES "public"."grids"("id");

ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "FK_0b03d1bc1cff784570333129e63" FOREIGN KEY ("historical_grid_id") REFERENCES "public"."grids"("id");

ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "FK_0b171330be0cb621f8d73b87a9e" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id");

ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "FK_13bf998d703e7d4c7b9a90f4f76" FOREIGN KEY ("supabase_id") REFERENCES "auth"."users"("id");

ALTER TABLE ONLY "public"."audits"
    ADD CONSTRAINT "FK_18c521072a6ca9d57365ffb24fe" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id");

ALTER TABLE ONLY "public"."audits"
    ADD CONSTRAINT "FK_236a383b1007cf64f0c8c7f6534" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");

ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "FK_238d61e0f8ac37278f726efac20" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");

ALTER TABLE ONLY "public"."dcus"
    ADD CONSTRAINT "FK_254c3db39098da62eb3f96f0006" FOREIGN KEY ("grid_id") REFERENCES "public"."grids"("id");

ALTER TABLE ONLY "public"."directives"
    ADD CONSTRAINT "FK_259bc4fc1c63035217ee41a719d" FOREIGN KEY ("meter_commissioning_id") REFERENCES "public"."meter_commissionings"("id");

ALTER TABLE ONLY "public"."directives"
    ADD CONSTRAINT "FK_276c89b475e9805d3322a36657a" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id");

ALTER TABLE ONLY "public"."poles"
    ADD CONSTRAINT "FK_2c21d74185234b0dd39588a4d36" FOREIGN KEY ("grid_id") REFERENCES "public"."grids"("id");

ALTER TABLE ONLY "public"."audits"
    ADD CONSTRAINT "FK_2d52a7fc85cfbb0421af977766e" FOREIGN KEY ("grid_id") REFERENCES "public"."grids"("id");

ALTER TABLE ONLY "public"."audits"
    ADD CONSTRAINT "FK_2fc5f64b328675b5203d54c7929" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id");

ALTER TABLE ONLY "public"."audits"
    ADD CONSTRAINT "FK_336b627b254b70b0702436e6aff" FOREIGN KEY ("author_id") REFERENCES "public"."accounts"("id");

ALTER TABLE ONLY "public"."metering_hardware_install_sessions"
    ADD CONSTRAINT "FK_35239534a89f0d6dab2612645eb" FOREIGN KEY ("author_id") REFERENCES "public"."accounts"("id");

ALTER TABLE ONLY "public"."notes"
    ADD CONSTRAINT "FK_35b89a50cb9203dccff44136519" FOREIGN KEY ("author_id") REFERENCES "public"."accounts"("id");

ALTER TABLE ONLY "public"."connections"
    ADD CONSTRAINT "FK_37f79eb1e29a53cc582fbb805e0" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");

ALTER TABLE ONLY "public"."ussd_sessions"
    ADD CONSTRAINT "FK_3a2606011b8d9f1de07de2bf0a8" FOREIGN KEY ("meter_id") REFERENCES "public"."meters"("id");

ALTER TABLE ONLY "public"."meter_credit_transfers"
    ADD CONSTRAINT "FK_3b4ebdcd826c46e4b5c165a0840" FOREIGN KEY ("sender_meter_id") REFERENCES "public"."meters"("id");

ALTER TABLE ONLY "public"."routers"
    ADD CONSTRAINT "FK_3c3ddc58369a9a8147776e39f40" FOREIGN KEY ("grid_id") REFERENCES "public"."grids"("id");

ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "FK_3cb0558ed36997f1d9ecc1118e7" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id");

ALTER TABLE ONLY "public"."directives"
    ADD CONSTRAINT "FK_3f3cc652d521872dbfe604b05b6" FOREIGN KEY ("meter_credit_transfer_id") REFERENCES "public"."meter_credit_transfers"("id");

ALTER TABLE ONLY "public"."metering_hardware_install_sessions"
    ADD CONSTRAINT "FK_3f770c153b3333ad1d29cfbf784" FOREIGN KEY ("meter_id") REFERENCES "public"."meters"("id");

ALTER TABLE ONLY "public"."grids"
    ADD CONSTRAINT "FK_433ef6a589cd535dff42b34612e" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");

ALTER TABLE ONLY "public"."bank_accounts"
    ADD CONSTRAINT "FK_482543ba26483726aaa00d39174" FOREIGN KEY ("bank_id") REFERENCES "public"."banks"("id");

ALTER TABLE ONLY "public"."audits"
    ADD CONSTRAINT "FK_4a300197465db92edfc5563d20b" FOREIGN KEY ("meter_id") REFERENCES "public"."meters"("id");

ALTER TABLE ONLY "public"."ussd_sessions"
    ADD CONSTRAINT "FK_4cad92626a62976ac0b49244d2e" FOREIGN KEY ("bank_id") REFERENCES "public"."banks"("id");

ALTER TABLE ONLY "public"."member_feature"
    ADD CONSTRAINT "FK_4da956d70d1de38087b251b9978" FOREIGN KEY ("feature_id") REFERENCES "public"."features"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."metering_hardware_install_sessions"
    ADD CONSTRAINT "FK_4eb64f5decb7250cfa993410c1e" FOREIGN KEY ("last_meter_commissioning_id") REFERENCES "public"."meter_commissionings"("id");

ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "FK_51a88ee1d4fceb047e7cfda3baa" FOREIGN KEY ("grid_id") REFERENCES "public"."grids"("id");

ALTER TABLE ONLY "public"."meters"
    ADD CONSTRAINT "FK_5606d6ec5ab568377509edc5267" FOREIGN KEY ("last_encountered_issue_id") REFERENCES "public"."issues"("id");

ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "FK_576b0e9af0bec469bff33b965aa" FOREIGN KEY ("receiver_wallet_id") REFERENCES "public"."wallets"("id");

ALTER TABLE ONLY "public"."metering_hardware_imports"
    ADD CONSTRAINT "FK_5c2bb31b2e45c3f1da0b72071a2" FOREIGN KEY ("metering_hardware_install_session_id") REFERENCES "public"."metering_hardware_install_sessions"("id");

ALTER TABLE ONLY "public"."directive_batches"
    ADD CONSTRAINT "FK_5c44fae05dc443720f62664e563" FOREIGN KEY ("grid_id") REFERENCES "public"."grids"("id");

ALTER TABLE ONLY "public"."notes"
    ADD CONSTRAINT "FK_5ec9536f852f1923097ba1ecdac" FOREIGN KEY ("meter_id") REFERENCES "public"."meters"("id");

ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "FK_60816230893327daacc86ab41c8" FOREIGN KEY ("author_id") REFERENCES "public"."accounts"("id");

ALTER TABLE ONLY "public"."directives"
    ADD CONSTRAINT "FK_637c697dc2877f08538b2fa02f5" FOREIGN KEY ("directive_watchdog_session_id") REFERENCES "public"."directive_watchdog_sessions"("id");

ALTER TABLE ONLY "public"."wallets"
    ADD CONSTRAINT "FK_6580899a2293de27787376887fa" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");

ALTER TABLE ONLY "public"."meter_commissionings"
    ADD CONSTRAINT "FK_6684f0790c54ed3d441f78df91a" FOREIGN KEY ("metering_hardware_install_session_id") REFERENCES "public"."metering_hardware_install_sessions"("id");

ALTER TABLE ONLY "public"."directives"
    ADD CONSTRAINT "FK_6c4e7feadae61cb27761734b11d" FOREIGN KEY ("meter_id") REFERENCES "public"."meters"("id");

ALTER TABLE ONLY "public"."directive_batches"
    ADD CONSTRAINT "FK_6e26cb6e966f484f0f897127c84" FOREIGN KEY ("author_id") REFERENCES "public"."accounts"("id");

ALTER TABLE ONLY "public"."payouts"
    ADD CONSTRAINT "FK_7796c1df57eeefa9173325627c4" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id");

ALTER TABLE ONLY "public"."directive_batch_executions"
    ADD CONSTRAINT "FK_7b0737005e7c358392d87ebb329" FOREIGN KEY ("directive_batch_id") REFERENCES "public"."directive_batches"("id");

ALTER TABLE ONLY "public"."issues"
    ADD CONSTRAINT "FK_7b15f3fbbedf51a1a3d21583b7e" FOREIGN KEY ("meter_id") REFERENCES "public"."meters"("id");

ALTER TABLE ONLY "public"."meters"
    ADD CONSTRAINT "FK_86d4557a79e374b5c55cb3b66d8" FOREIGN KEY ("last_metering_hardware_install_session_id") REFERENCES "public"."metering_hardware_install_sessions"("id");

ALTER TABLE ONLY "public"."wallets"
    ADD CONSTRAINT "FK_8db1f4e4f8122bd25d50ad96b26" FOREIGN KEY ("meter_id") REFERENCES "public"."meters"("id");

ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "FK_8f12fe9c7b078122adcae80375d" FOREIGN KEY ("sender_wallet_id") REFERENCES "public"."wallets"("id");

ALTER TABLE ONLY "public"."directives"
    ADD CONSTRAINT "FK_9064328678b805e99750773387d" FOREIGN KEY ("retry_of_directive_id") REFERENCES "public"."directives"("id");

ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "FK_92081072063eaf51300ab6c267d" FOREIGN KEY ("ussd_session_id") REFERENCES "public"."ussd_sessions"("id");

ALTER TABLE ONLY "public"."dcus"
    ADD CONSTRAINT "FK_9334b587e6e5291f8ccd1b11c44" FOREIGN KEY ("last_metering_hardware_install_session_id") REFERENCES "public"."metering_hardware_install_sessions"("id");

ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "FK_982f77636cb1da8e76745949530" FOREIGN KEY ("notification_parameter_id") REFERENCES "public"."notification_parameters"("id");

ALTER TABLE ONLY "public"."agents"
    ADD CONSTRAINT "FK_9bb7cb7efc780ec4d3dec34354f" FOREIGN KEY ("grid_id") REFERENCES "public"."grids"("id");

ALTER TABLE ONLY "public"."meters"
    ADD CONSTRAINT "FK_a11871575f7ddb95e567d842bc6" FOREIGN KEY ("pole_id") REFERENCES "public"."poles"("id");

ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "FK_a1ec3b4b4f2017665b534e60256" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id");

ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "FK_a53c58bdb5ae0193f17497c81b4" FOREIGN KEY ("meter_credit_transfer_id") REFERENCES "public"."meter_credit_transfers"("id");

ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "FK_a9da2a35fdd2cd46a7bfc57fd73" FOREIGN KEY ("busy_commissioning_id") REFERENCES "public"."grids"("id");

ALTER TABLE ONLY "public"."audits"
    ADD CONSTRAINT "FK_abde505f056e2f46c5df2c12491" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");

ALTER TABLE ONLY "public"."meter_credit_transfers"
    ADD CONSTRAINT "FK_b196e2b2b291716e18a11611350" FOREIGN KEY ("author_id") REFERENCES "public"."accounts"("id");

ALTER TABLE ONLY "public"."energy_cabins"
    ADD CONSTRAINT "FK_ba81ffc1506025a549849f06f36" FOREIGN KEY ("grid_id") REFERENCES "public"."grids"("id");

ALTER TABLE ONLY "public"."metering_hardware_install_sessions"
    ADD CONSTRAINT "FK_be64a09dc738420a409cb960264" FOREIGN KEY ("last_metering_hardware_import_id") REFERENCES "public"."metering_hardware_imports"("id");

ALTER TABLE ONLY "public"."issues"
    ADD CONSTRAINT "FK_be8d64bd0c97a739ac323dde9dd" FOREIGN KEY ("grid_id") REFERENCES "public"."grids"("id");

ALTER TABLE ONLY "public"."issues"
    ADD CONSTRAINT "FK_bf46db804a794d1d09eb050ac77" FOREIGN KEY ("mppt_id") REFERENCES "public"."mppts"("id");

ALTER TABLE ONLY "public"."ussd_session_hops"
    ADD CONSTRAINT "FK_bf89299bd6534528adad645b7a5" FOREIGN KEY ("ussd_session_id") REFERENCES "public"."ussd_sessions"("id");

ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "FK_c1053eec8005016c7d9febdc484" FOREIGN KEY ("grid_id") REFERENCES "public"."grids"("id");

ALTER TABLE ONLY "public"."member_feature"
    ADD CONSTRAINT "FK_c312f698867204bf4f1fd149c91" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "FK_cb7b1fb018b296f2107e998b2ff" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");

ALTER TABLE ONLY "public"."bank_accounts"
    ADD CONSTRAINT "FK_cc20105b139589c697648c925c3" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");

ALTER TABLE ONLY "public"."meters"
    ADD CONSTRAINT "FK_d281c6e5f391b8de5b221032da6" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id");

ALTER TABLE ONLY "public"."connection_requested_meters"
    ADD CONSTRAINT "FK_d390197863e9a88be5e122d9695" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id");

ALTER TABLE ONLY "public"."api_keys"
    ADD CONSTRAINT "FK_decaf331589778e33441b2a8d9e" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id");

ALTER TABLE ONLY "public"."agents"
    ADD CONSTRAINT "FK_df520decc9e003a843d8edd9867" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id");

ALTER TABLE ONLY "public"."notes"
    ADD CONSTRAINT "FK_e04c36c14bc9f01f84cd7655b68" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");

ALTER TABLE ONLY "public"."payouts"
    ADD CONSTRAINT "FK_e2e6de2a3c003b36f840829079a" FOREIGN KEY ("approved_by_account_id") REFERENCES "public"."accounts"("id");

ALTER TABLE ONLY "public"."audits"
    ADD CONSTRAINT "FK_e3f3409859562fbe10b78d1399e" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id");

ALTER TABLE ONLY "public"."wallets"
    ADD CONSTRAINT "FK_e63e504d8e35ef37a2c56b75eb9" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id");

ALTER TABLE ONLY "public"."meter_credit_transfers"
    ADD CONSTRAINT "FK_e83e8905a777a669de1c2391b77" FOREIGN KEY ("receiver_meter_id") REFERENCES "public"."meters"("id");

ALTER TABLE ONLY "public"."payouts"
    ADD CONSTRAINT "FK_e8bc1a446b4df957b8d37af1cd0" FOREIGN KEY ("grid_id") REFERENCES "public"."grids"("id");

ALTER TABLE ONLY "public"."audits"
    ADD CONSTRAINT "FK_eb582acfd9d83af268d328e0b79" FOREIGN KEY ("dcu_id") REFERENCES "public"."dcus"("id");

ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "FK_ebcc29963874e55053e8ee80be5" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id");

ALTER TABLE ONLY "public"."ussd_sessions"
    ADD CONSTRAINT "FK_ede50d58fa445bfa012135249fd" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id");

ALTER TABLE ONLY "public"."notes"
    ADD CONSTRAINT "FK_f1a5ea7b77453030e2a1df27479" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id");

ALTER TABLE ONLY "public"."directives"
    ADD CONSTRAINT "FK_f3a84a3f4b619b1ca8c179fff6c" FOREIGN KEY ("author_id") REFERENCES "public"."accounts"("id");

ALTER TABLE ONLY "public"."metering_hardware_install_sessions"
    ADD CONSTRAINT "FK_f3c53f4b922a011aa53d9e0b1ad" FOREIGN KEY ("dcu_id") REFERENCES "public"."dcus"("id");

ALTER TABLE ONLY "public"."wallets"
    ADD CONSTRAINT "FK_f499c61c6d6a0ac3f794d966edc" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");

ALTER TABLE ONLY "public"."wallets"
    ADD CONSTRAINT "FK_f5782e05e8688f0cfbb5c4a52ce" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id");

ALTER TABLE ONLY "public"."directives"
    ADD CONSTRAINT "FK_f9e3439b6ea7096d6a9d85c4503" FOREIGN KEY ("directive_batch_execution_id") REFERENCES "public"."directive_batch_executions"("id");

ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "FK_fd9dfb97e21b75fc45d42aa614a" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id");

ALTER TABLE ONLY "public"."agents"
    ADD CONSTRAINT "agents_rls_organization_id_fkey" FOREIGN KEY ("rls_organization_id") REFERENCES "public"."organizations"("id");

ALTER TABLE ONLY "public"."connection_requested_meters"
    ADD CONSTRAINT "connection_requested_meters_rls_organization_id_fkey" FOREIGN KEY ("rls_organization_id") REFERENCES "public"."organizations"("id");

ALTER TABLE ONLY "public"."connections"
    ADD CONSTRAINT "connections_rls_organization_id_fkey" FOREIGN KEY ("rls_organization_id") REFERENCES "public"."organizations"("id");

ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_rls_organization_id_fkey" FOREIGN KEY ("rls_organization_id") REFERENCES "public"."organizations"("id");

ALTER TABLE ONLY "public"."dcus"
    ADD CONSTRAINT "dcus_rls_organization_id_fkey" FOREIGN KEY ("rls_organization_id") REFERENCES "public"."organizations"("id");

ALTER TABLE ONLY "public"."device_logs"
    ADD CONSTRAINT "device_logs_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id");

ALTER TABLE ONLY "public"."device_logs"
    ADD CONSTRAINT "device_logs_rls_organization_id_fkey" FOREIGN KEY ("rls_organization_id") REFERENCES "public"."organizations"("id");

ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_device_type_id_fkey" FOREIGN KEY ("device_type_id") REFERENCES "public"."device_types"("id");

ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_grid_id_fkey" FOREIGN KEY ("grid_id") REFERENCES "public"."grids"("id");

ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_rls_organization_id_fkey" FOREIGN KEY ("rls_organization_id") REFERENCES "public"."organizations"("id");

ALTER TABLE ONLY "public"."directive_batch_executions"
    ADD CONSTRAINT "directive_batch_executions_rls_organization_id_fkey" FOREIGN KEY ("rls_organization_id") REFERENCES "public"."organizations"("id");

ALTER TABLE ONLY "public"."directive_batches"
    ADD CONSTRAINT "directive_batches_rls_organization_id_fkey" FOREIGN KEY ("rls_organization_id") REFERENCES "public"."organizations"("id");

ALTER TABLE ONLY "public"."directives"
    ADD CONSTRAINT "directives_rls_organization_id_fkey" FOREIGN KEY ("rls_organization_id") REFERENCES "public"."organizations"("id");

ALTER TABLE ONLY "public"."energy_cabins"
    ADD CONSTRAINT "energy_cabins_rls_organization_id_fkey" FOREIGN KEY ("rls_organization_id") REFERENCES "public"."organizations"("id");

ALTER TABLE ONLY "public"."issues"
    ADD CONSTRAINT "issues_rls_organization_id_fkey" FOREIGN KEY ("rls_organization_id") REFERENCES "public"."organizations"("id");

ALTER TABLE ONLY "public"."lorawan_directives"
    ADD CONSTRAINT "lorawan_directives_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."accounts"("id");

ALTER TABLE ONLY "public"."lorawan_directives"
    ADD CONSTRAINT "lorawan_directives_directive_batch_execution_id_fkey" FOREIGN KEY ("directive_batch_execution_id") REFERENCES "public"."directive_batch_executions"("id");

ALTER TABLE ONLY "public"."lorawan_directives"
    ADD CONSTRAINT "lorawan_directives_directive_watchdog_session_id_fkey" FOREIGN KEY ("directive_watchdog_session_id") REFERENCES "public"."directive_watchdog_sessions"("id");

ALTER TABLE ONLY "public"."lorawan_directives"
    ADD CONSTRAINT "lorawan_directives_meter_commissioning_id_fkey" FOREIGN KEY ("meter_commissioning_id") REFERENCES "public"."meter_commissionings"("id");

ALTER TABLE ONLY "public"."lorawan_directives"
    ADD CONSTRAINT "lorawan_directives_meter_id_fkey" FOREIGN KEY ("meter_id") REFERENCES "public"."meters"("id");

ALTER TABLE ONLY "public"."lorawan_directives"
    ADD CONSTRAINT "lorawan_directives_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id");

ALTER TABLE ONLY "public"."lorawan_directives"
    ADD CONSTRAINT "lorawan_directives_retry_of_directive_id_fkey" FOREIGN KEY ("retry_of_directive_id") REFERENCES "public"."lorawan_directives"("id");

ALTER TABLE ONLY "public"."lorawan_directives"
    ADD CONSTRAINT "lorawan_directives_rls_organization_id_fkey" FOREIGN KEY ("rls_organization_id") REFERENCES "public"."organizations"("id");

ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "members_rls_organization_id_fkey" FOREIGN KEY ("rls_organization_id") REFERENCES "public"."organizations"("id");

ALTER TABLE ONLY "public"."meter_commissionings"
    ADD CONSTRAINT "meter_commissionings_rls_organization_id_fkey" FOREIGN KEY ("rls_organization_id") REFERENCES "public"."organizations"("id");

ALTER TABLE ONLY "public"."meter_credit_transfers"
    ADD CONSTRAINT "meter_credit_transfers_rls_organization_id_fkey" FOREIGN KEY ("rls_organization_id") REFERENCES "public"."organizations"("id");

ALTER TABLE ONLY "public"."meter_interactions"
    ADD CONSTRAINT "meter_interactions_meter_id_fkey" FOREIGN KEY ("meter_id") REFERENCES "public"."meters"("id");

ALTER TABLE ONLY "public"."meter_interactions"
    ADD CONSTRAINT "meter_interactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id");

ALTER TABLE ONLY "public"."metering_hardware_imports"
    ADD CONSTRAINT "metering_hardware_imports_rls_organization_id_fkey" FOREIGN KEY ("rls_organization_id") REFERENCES "public"."organizations"("id");

ALTER TABLE ONLY "public"."metering_hardware_install_sessions"
    ADD CONSTRAINT "metering_hardware_install_sessions_rls_organization_id_fkey" FOREIGN KEY ("rls_organization_id") REFERENCES "public"."organizations"("id");

ALTER TABLE ONLY "public"."meters"
    ADD CONSTRAINT "meters_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id");

ALTER TABLE ONLY "public"."meters"
    ADD CONSTRAINT "meters_rls_grid_id_fkey" FOREIGN KEY ("rls_grid_id") REFERENCES "public"."grids"("id");

ALTER TABLE ONLY "public"."meters"
    ADD CONSTRAINT "meters_rls_organization_id_fkey" FOREIGN KEY ("rls_organization_id") REFERENCES "public"."organizations"("id");

ALTER TABLE ONLY "public"."mppts"
    ADD CONSTRAINT "mppts_rls_organization_id_fkey" FOREIGN KEY ("rls_organization_id") REFERENCES "public"."organizations"("id");

ALTER TABLE ONLY "public"."notes"
    ADD CONSTRAINT "notes_rls_organization_id_fkey" FOREIGN KEY ("rls_organization_id") REFERENCES "public"."organizations"("id");

ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_lorawan_directive_id_fkey" FOREIGN KEY ("lorawan_directive_id") REFERENCES "public"."lorawan_directives"("id");

ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_rls_organization_id_fkey" FOREIGN KEY ("rls_organization_id") REFERENCES "public"."organizations"("id");

ALTER TABLE ONLY "public"."pd_action_templates"
    ADD CONSTRAINT "pd_action_templates_pd_document_template_id_fkey" FOREIGN KEY ("pd_document_template_id") REFERENCES "public"."pd_document_templates"("id");

ALTER TABLE ONLY "public"."pd_action_templates"
    ADD CONSTRAINT "pd_action_templates_pd_flow_template_id_fkey" FOREIGN KEY ("pd_flow_template_id") REFERENCES "public"."pd_flow_templates"("id");

ALTER TABLE ONLY "public"."pd_actions"
    ADD CONSTRAINT "pd_actions_latest_pd_document_id_fkey" FOREIGN KEY ("latest_pd_document_id") REFERENCES "public"."pd_documents"("id");

ALTER TABLE ONLY "public"."pd_actions"
    ADD CONSTRAINT "pd_actions_pd_action_template_id_fkey" FOREIGN KEY ("pd_action_template_id") REFERENCES "public"."pd_action_templates"("id");

ALTER TABLE ONLY "public"."pd_actions"
    ADD CONSTRAINT "pd_actions_pd_flow_id_fkey" FOREIGN KEY ("pd_flow_id") REFERENCES "public"."pd_flows"("id");

ALTER TABLE ONLY "public"."pd_actions"
    ADD CONSTRAINT "pd_actions_pd_section_id_fkey" FOREIGN KEY ("pd_section_id") REFERENCES "public"."pd_actions"("id");

ALTER TABLE ONLY "public"."pd_audits"
    ADD CONSTRAINT "pd_audits_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."accounts"("id");

ALTER TABLE ONLY "public"."pd_audits"
    ADD CONSTRAINT "pd_audits_pd_action_id_fkey" FOREIGN KEY ("pd_action_id") REFERENCES "public"."pd_actions"("id");

ALTER TABLE ONLY "public"."pd_documents"
    ADD CONSTRAINT "pd_documents_pd_action_id_fkey" FOREIGN KEY ("pd_action_id") REFERENCES "public"."pd_actions"("id");

ALTER TABLE ONLY "public"."pd_flows"
    ADD CONSTRAINT "pd_flows_pd_flow_template_id_fkey" FOREIGN KEY ("pd_flow_template_id") REFERENCES "public"."pd_flow_templates"("id");

ALTER TABLE ONLY "public"."pd_site_submissions"
    ADD CONSTRAINT "pd_site_submissions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");

ALTER TABLE ONLY "public"."pd_sites"
    ADD CONSTRAINT "pd_sites_operations_grid_id_fkey" FOREIGN KEY ("operations_grid_id") REFERENCES "public"."grids"("id");

ALTER TABLE ONLY "public"."pd_sites"
    ADD CONSTRAINT "pd_sites_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");

ALTER TABLE ONLY "public"."pd_sites"
    ADD CONSTRAINT "pd_sites_pd_flow_id_fkey" FOREIGN KEY ("pd_flow_id") REFERENCES "public"."pd_flows"("id");

ALTER TABLE ONLY "public"."poles"
    ADD CONSTRAINT "poles_rls_organization_id_fkey" FOREIGN KEY ("rls_organization_id") REFERENCES "public"."organizations"("id");

ALTER TABLE ONLY "public"."routers"
    ADD CONSTRAINT "routers_rls_organization_id_fkey" FOREIGN KEY ("rls_organization_id") REFERENCES "public"."organizations"("id");

ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_rls_organization_id_fkey" FOREIGN KEY ("rls_organization_id") REFERENCES "public"."organizations"("id");

ALTER TABLE ONLY "public"."wallets"
    ADD CONSTRAINT "wallets_rls_organization_id_fkey" FOREIGN KEY ("rls_organization_id") REFERENCES "public"."organizations"("id");

CREATE POLICY "Allow Grafana to Select" ON "public"."lorawan_directives" FOR SELECT TO "grafana_readonly" USING (true);

CREATE POLICY "Allow Grafana to select" ON "public"."connections" FOR SELECT TO "grafana_readonly" USING (true);

CREATE POLICY "Allow Grafana to select" ON "public"."customers" FOR SELECT TO "grafana_readonly" USING (true);

CREATE POLICY "Allow Grafana to select" ON "public"."dcus" FOR SELECT TO "grafana_readonly" USING (true);

CREATE POLICY "Allow Grafana to select" ON "public"."directive_batch_executions" FOR SELECT TO "grafana_readonly" USING (true);

CREATE POLICY "Allow Grafana to select" ON "public"."directive_batches" FOR SELECT TO "grafana_readonly" USING (true);

CREATE POLICY "Allow Grafana to select" ON "public"."directives" FOR SELECT TO "grafana_readonly" USING (true);

CREATE POLICY "Allow Grafana to select" ON "public"."meters" FOR SELECT TO "grafana_readonly" USING (true);

CREATE POLICY "Allow Grafana to select" ON "public"."orders" FOR SELECT TO "grafana_readonly" USING (true);

CREATE POLICY "Allow Grafana to select" ON "public"."organizations" FOR SELECT TO "grafana_readonly" USING (true);

CREATE POLICY "Allow Grafana to select" ON "public"."transactions" FOR SELECT TO "grafana_readonly" USING (true);

CREATE POLICY "Allow Grafana to select" ON "public"."wallets" FOR SELECT TO "grafana_readonly" USING (true);

CREATE POLICY "Allow Grafana to select all" ON "public"."grids" FOR SELECT TO "grafana_readonly" USING (true);

CREATE POLICY "Allow Make to select" ON "public"."accounts" FOR SELECT TO "make_readonly" USING (true);

CREATE POLICY "Allow Make to select" ON "public"."dcus" FOR SELECT TO "make_readonly" USING (true);

CREATE POLICY "Allow Make to select" ON "public"."grids" FOR SELECT TO "make_readonly" USING (true);

CREATE POLICY "Allow Make to select" ON "public"."organizations" FOR SELECT TO "make_readonly" USING (true);

CREATE POLICY "Allow NXT Grid to CRUD" ON "public"."connections" TO "authenticated" USING (( SELECT "public"."rls_check_if_nxt_member"() AS "rls_check_if_nxt_member"));

CREATE POLICY "Allow NXT Grid to insert" ON "public"."grids" FOR INSERT TO "authenticated" WITH CHECK ("public"."rls_check_if_nxt_member"());

CREATE POLICY "Allow NXT Grid to insert" ON "public"."meters" FOR INSERT TO "authenticated" WITH CHECK ("public"."rls_check_if_nxt_member"());

CREATE POLICY "Allow NXT Grid to insert" ON "public"."notes" FOR INSERT TO "authenticated" WITH CHECK ("public"."rls_check_if_nxt_member"());

CREATE POLICY "Allow NXT Grid to insert" ON "public"."organizations" FOR INSERT TO "authenticated" WITH CHECK ("public"."rls_check_if_nxt_member"());

CREATE POLICY "Allow NXT Grid to insert" ON "public"."pd_actions" FOR INSERT TO "authenticated" WITH CHECK ("public"."rls_check_if_nxt_member"());

CREATE POLICY "Allow NXT Grid to insert" ON "public"."pd_documents" FOR INSERT TO "authenticated" WITH CHECK (( SELECT "public"."rls_check_if_nxt_member"() AS "rls_check_if_nxt_member"));

CREATE POLICY "Allow NXT Grid to insert" ON "public"."pd_flows" FOR INSERT TO "authenticated" WITH CHECK ("public"."rls_check_if_nxt_member"());

CREATE POLICY "Allow NXT Grid to insert" ON "public"."pd_sites" FOR INSERT TO "authenticated" WITH CHECK ("public"."rls_check_if_nxt_member"());

CREATE POLICY "Allow NXT Grid to insert" ON "public"."poles" FOR INSERT TO "authenticated" WITH CHECK ("public"."rls_check_if_nxt_member"());

CREATE POLICY "Allow NXT Grid to insert" ON "public"."wallets" FOR INSERT WITH CHECK ("public"."rls_check_if_nxt_member"());

CREATE POLICY "Allow NXT Grid to select" ON "public"."accounts" FOR SELECT TO "authenticated" USING (( SELECT "public"."rls_check_if_nxt_member"() AS "rls_check_if_nxt_member"));

CREATE POLICY "Allow NXT Grid to select" ON "public"."agents" FOR SELECT TO "authenticated" USING (( SELECT "public"."rls_check_if_nxt_member"() AS "rls_check_if_nxt_member"));

CREATE POLICY "Allow NXT Grid to select" ON "public"."connection_requested_meters" FOR SELECT TO "authenticated" USING (( SELECT "public"."rls_check_if_nxt_member"() AS "rls_check_if_nxt_member"));

CREATE POLICY "Allow NXT Grid to select" ON "public"."connections" FOR SELECT TO "authenticated" USING (( SELECT "public"."rls_check_if_nxt_member"() AS "rls_check_if_nxt_member"));

CREATE POLICY "Allow NXT Grid to select" ON "public"."customers" FOR SELECT TO "authenticated" USING (( SELECT "public"."rls_check_if_nxt_member"() AS "rls_check_if_nxt_member"));

CREATE POLICY "Allow NXT Grid to select" ON "public"."dcus" FOR SELECT TO "authenticated" USING (( SELECT "public"."rls_check_if_nxt_member"() AS "rls_check_if_nxt_member"));

CREATE POLICY "Allow NXT Grid to select" ON "public"."device_logs" FOR SELECT TO "authenticated" USING (( SELECT "public"."rls_check_if_nxt_member"() AS "rls_check_if_nxt_member"));

CREATE POLICY "Allow NXT Grid to select" ON "public"."directive_batch_executions" FOR SELECT TO "authenticated" USING (( SELECT "public"."rls_check_if_nxt_member"() AS "rls_check_if_nxt_member"));

CREATE POLICY "Allow NXT Grid to select" ON "public"."directive_batches" FOR SELECT TO "authenticated" USING (( SELECT "public"."rls_check_if_nxt_member"() AS "rls_check_if_nxt_member"));

CREATE POLICY "Allow NXT Grid to select" ON "public"."directives" FOR SELECT TO "authenticated" USING (( SELECT "public"."rls_check_if_nxt_member"() AS "rls_check_if_nxt_member"));

CREATE POLICY "Allow NXT Grid to select" ON "public"."energy_cabins" FOR SELECT TO "authenticated" USING (( SELECT "public"."rls_check_if_nxt_member"() AS "rls_check_if_nxt_member"));

CREATE POLICY "Allow NXT Grid to select" ON "public"."features" FOR SELECT TO "authenticated" USING (( SELECT "public"."rls_check_if_nxt_member"() AS "rls_check_if_nxt_member"));

CREATE POLICY "Allow NXT Grid to select" ON "public"."grids" FOR SELECT TO "authenticated" USING (( SELECT "public"."rls_check_if_nxt_member"() AS "rls_check_if_nxt_member"));

CREATE POLICY "Allow NXT Grid to select" ON "public"."issues" FOR SELECT TO "authenticated" USING (( SELECT "public"."rls_check_if_nxt_member"() AS "rls_check_if_nxt_member"));

CREATE POLICY "Allow NXT Grid to select" ON "public"."lorawan_directives" FOR SELECT TO "authenticated" USING (( SELECT "public"."rls_check_if_nxt_member"() AS "rls_check_if_nxt_member"));

CREATE POLICY "Allow NXT Grid to select" ON "public"."members" FOR SELECT TO "authenticated" USING (( SELECT "public"."rls_check_if_nxt_member"() AS "rls_check_if_nxt_member"));

CREATE POLICY "Allow NXT Grid to select" ON "public"."meter_commissionings" FOR SELECT TO "authenticated" USING (( SELECT "public"."rls_check_if_nxt_member"() AS "rls_check_if_nxt_member"));

CREATE POLICY "Allow NXT Grid to select" ON "public"."meter_interactions" FOR SELECT TO "authenticated" USING (( SELECT "public"."rls_check_if_nxt_member"() AS "rls_check_if_nxt_member"));

CREATE POLICY "Allow NXT Grid to select" ON "public"."metering_hardware_install_sessions" FOR SELECT TO "authenticated" USING (( SELECT "public"."rls_check_if_nxt_member"() AS "rls_check_if_nxt_member"));

CREATE POLICY "Allow NXT Grid to select" ON "public"."meters" FOR SELECT TO "authenticated" USING (( SELECT "public"."rls_check_if_nxt_member"() AS "rls_check_if_nxt_member"));

CREATE POLICY "Allow NXT Grid to select" ON "public"."mppts" FOR SELECT TO "authenticated" USING (( SELECT "public"."rls_check_if_nxt_member"() AS "rls_check_if_nxt_member"));

CREATE POLICY "Allow NXT Grid to select" ON "public"."notes" FOR SELECT TO "authenticated" USING (( SELECT "public"."rls_check_if_nxt_member"() AS "rls_check_if_nxt_member"));

CREATE POLICY "Allow NXT Grid to select" ON "public"."orders" FOR SELECT TO "authenticated" USING (( SELECT "public"."rls_check_if_nxt_member"() AS "rls_check_if_nxt_member"));

CREATE POLICY "Allow NXT Grid to select" ON "public"."organizations" FOR SELECT TO "authenticated" USING (( SELECT "public"."rls_check_if_nxt_member"() AS "rls_check_if_nxt_member"));

CREATE POLICY "Allow NXT Grid to select" ON "public"."payouts" FOR SELECT TO "authenticated" USING (( SELECT "public"."rls_check_if_nxt_member"() AS "rls_check_if_nxt_member"));

CREATE POLICY "Allow NXT Grid to select" ON "public"."pd_actions" FOR SELECT TO "authenticated" USING (( SELECT "public"."rls_check_if_nxt_member"() AS "rls_check_if_nxt_member"));

CREATE POLICY "Allow NXT Grid to select" ON "public"."pd_flows" FOR SELECT TO "authenticated" USING (( SELECT "public"."rls_check_if_nxt_member"() AS "rls_check_if_nxt_member"));

CREATE POLICY "Allow NXT Grid to select" ON "public"."pd_sites" FOR SELECT TO "authenticated" USING (( SELECT "public"."rls_check_if_nxt_member"() AS "rls_check_if_nxt_member"));

CREATE POLICY "Allow NXT Grid to select" ON "public"."poles" FOR SELECT TO "authenticated" USING (( SELECT "public"."rls_check_if_nxt_member"() AS "rls_check_if_nxt_member"));

CREATE POLICY "Allow NXT Grid to select" ON "public"."routers" FOR SELECT TO "authenticated" USING (( SELECT "public"."rls_check_if_nxt_member"() AS "rls_check_if_nxt_member"));

CREATE POLICY "Allow NXT Grid to select" ON "public"."transactions" FOR SELECT TO "authenticated" USING (( SELECT "public"."rls_check_if_nxt_member"() AS "rls_check_if_nxt_member"));

CREATE POLICY "Allow NXT Grid to select" ON "public"."wallets" FOR SELECT TO "authenticated" USING (( SELECT "public"."rls_check_if_nxt_member"() AS "rls_check_if_nxt_member"));

CREATE POLICY "Allow NXT Grid to update" ON "public"."accounts" FOR UPDATE TO "authenticated" USING ("public"."rls_check_if_nxt_member"());

CREATE POLICY "Allow NXT Grid to update" ON "public"."connections" FOR UPDATE TO "authenticated" USING ("public"."rls_check_if_nxt_member"());

CREATE POLICY "Allow NXT Grid to update" ON "public"."features" FOR UPDATE TO "authenticated" USING ("public"."rls_check_if_nxt_member"());

CREATE POLICY "Allow NXT Grid to update" ON "public"."grids" FOR UPDATE TO "authenticated" USING ("public"."rls_check_if_nxt_member"());

CREATE POLICY "Allow NXT Grid to update" ON "public"."meters" FOR UPDATE TO "authenticated" USING ("public"."rls_check_if_nxt_member"());

CREATE POLICY "Allow NXT Grid to update" ON "public"."organizations" FOR UPDATE TO "authenticated" USING ("public"."rls_check_if_nxt_member"());

CREATE POLICY "Allow NXT Grid to update" ON "public"."pd_actions" FOR UPDATE TO "authenticated" USING ("public"."rls_check_if_nxt_member"());

CREATE POLICY "Allow NXT Grid to update" ON "public"."pd_flows" FOR UPDATE TO "authenticated" USING ("public"."rls_check_if_nxt_member"());

CREATE POLICY "Allow NXT Grid to update" ON "public"."pd_site_submissions" FOR UPDATE TO "authenticated" USING ("public"."rls_check_if_nxt_member"());

CREATE POLICY "Allow NXT Grid to update" ON "public"."pd_sites" FOR UPDATE TO "authenticated" USING ("public"."rls_check_if_nxt_member"());

CREATE POLICY "Allow NXT to select" ON "public"."devices" FOR SELECT TO "authenticated" USING (( SELECT "public"."rls_check_if_nxt_member"() AS "rls_check_if_nxt_member"));

CREATE POLICY "Allow anon" ON "public"."autopilot_executions" FOR SELECT TO "anon" USING (true);

CREATE POLICY "Allow authenticated to do everything" ON "public"."audits" USING (true);

CREATE POLICY "Allow authenticated to insert" ON "public"."device_types" FOR INSERT TO "authenticated" WITH CHECK (true);

CREATE POLICY "Allow authenticated to select" ON "public"."device_types" FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "Allow authenticated to select" ON "public"."metering_hardware_imports" FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "Allow authenticated to select" ON "public"."pd_action_templates" FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "Allow authenticated to select" ON "public"."pd_audits" FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "Allow authenticated to select" ON "public"."pd_document_templates" FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "Allow authenticated to select" ON "public"."pd_documents" FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "Allow authenticated to select" ON "public"."pd_flow_templates" FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "Allow authenticated to update" ON "public"."device_types" FOR UPDATE TO "authenticated" USING (true);

CREATE POLICY "Allow authors to update their own" ON "public"."notes" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = ( SELECT "account"."supabase_id"
   FROM "public"."accounts" "account"
  WHERE ("account"."id" = "notes"."author_id"))));

CREATE POLICY "Allow grafana to read" ON "public"."device_types" FOR SELECT TO "grafana_readonly" USING (true);

CREATE POLICY "Allow grafana to select" ON "public"."device_logs" FOR SELECT TO "grafana_readonly" USING (true);

CREATE POLICY "Allow grafana to select" ON "public"."devices" FOR SELECT TO "grafana_readonly" USING (true);

CREATE POLICY "Allow grafana to select all" ON "public"."metering_hardware_install_sessions" FOR SELECT TO "grafana_readonly" USING (true);

CREATE POLICY "Allow lenders to select" ON "public"."accounts" FOR SELECT TO "authenticated" USING (( SELECT "public"."rls_check_if_lender"() AS "rls_check_if_lender"));

CREATE POLICY "Allow lenders to select" ON "public"."customers" FOR SELECT TO "authenticated" USING (( SELECT "public"."rls_check_if_lender"() AS "rls_check_if_lender"));

CREATE POLICY "Allow lenders to select" ON "public"."grids" FOR SELECT TO "authenticated" USING (( SELECT "public"."rls_check_if_lender"() AS "rls_check_if_lender"));

CREATE POLICY "Allow lenders to select" ON "public"."orders" FOR SELECT TO "authenticated" USING (( SELECT "public"."rls_check_if_lender"() AS "rls_check_if_lender"));

CREATE POLICY "Allow member org to select" ON "public"."device_logs" FOR SELECT TO "authenticated" USING ((( SELECT "public"."rls_get_member_org_id"() AS "rls_get_member_org_id") = "rls_organization_id"));

CREATE POLICY "Allow org member to select" ON "public"."accounts" FOR SELECT TO "authenticated" USING ((( SELECT "public"."rls_get_member_org_id"() AS "rls_get_member_org_id") = "organization_id"));

CREATE POLICY "Allow org members to insert" ON "public"."notes" FOR INSERT TO "authenticated" WITH CHECK (("public"."rls_get_member_org_id"() = "rls_organization_id"));

CREATE POLICY "Allow org members to insert" ON "public"."poles" FOR INSERT WITH CHECK (("public"."rls_get_member_org_id"() = "rls_organization_id"));

CREATE POLICY "Allow org members to select" ON "public"."agents" FOR SELECT TO "authenticated" USING ((( SELECT "public"."rls_get_member_org_id"() AS "rls_get_member_org_id") = "rls_organization_id"));

CREATE POLICY "Allow org members to select" ON "public"."connection_requested_meters" FOR SELECT TO "authenticated" USING ((( SELECT "public"."rls_get_member_org_id"() AS "rls_get_member_org_id") = "rls_organization_id"));

CREATE POLICY "Allow org members to select" ON "public"."connections" FOR SELECT TO "authenticated" USING ((( SELECT "public"."rls_get_member_org_id"() AS "rls_get_member_org_id") = "rls_organization_id"));

CREATE POLICY "Allow org members to select" ON "public"."customers" FOR SELECT TO "authenticated" USING ((( SELECT "public"."rls_get_member_org_id"() AS "rls_get_member_org_id") = "rls_organization_id"));

CREATE POLICY "Allow org members to select" ON "public"."dcus" FOR SELECT TO "authenticated" USING ((( SELECT "public"."rls_get_member_org_id"() AS "rls_get_member_org_id") = "rls_organization_id"));

CREATE POLICY "Allow org members to select" ON "public"."devices" FOR SELECT TO "authenticated" USING ((( SELECT "public"."rls_get_member_org_id"() AS "rls_get_member_org_id") = "rls_organization_id"));

CREATE POLICY "Allow org members to select" ON "public"."directive_batches" FOR SELECT TO "authenticated" USING ((( SELECT "public"."rls_get_member_org_id"() AS "rls_get_member_org_id") = "rls_organization_id"));

CREATE POLICY "Allow org members to select" ON "public"."directives" FOR SELECT TO "authenticated" USING ((( SELECT "public"."rls_get_member_org_id"() AS "rls_get_member_org_id") = "rls_organization_id"));

CREATE POLICY "Allow org members to select" ON "public"."energy_cabins" FOR SELECT TO "authenticated" USING ((( SELECT "public"."rls_get_member_org_id"() AS "rls_get_member_org_id") = "rls_organization_id"));

CREATE POLICY "Allow org members to select" ON "public"."grids" FOR SELECT TO "authenticated" USING ((( SELECT "public"."rls_get_member_org_id"() AS "rls_get_member_org_id") = "organization_id"));

CREATE POLICY "Allow org members to select" ON "public"."issues" FOR SELECT TO "authenticated" USING ((( SELECT "public"."rls_get_member_org_id"() AS "rls_get_member_org_id") = "rls_organization_id"));

CREATE POLICY "Allow org members to select" ON "public"."lorawan_directives" FOR SELECT TO "authenticated" USING ((( SELECT "public"."rls_get_member_org_id"() AS "rls_get_member_org_id") = "rls_organization_id"));

CREATE POLICY "Allow org members to select" ON "public"."members" FOR SELECT TO "authenticated" USING ((( SELECT "public"."rls_get_member_org_id"() AS "rls_get_member_org_id") = "rls_organization_id"));

CREATE POLICY "Allow org members to select" ON "public"."meter_commissionings" FOR SELECT TO "authenticated" USING ((( SELECT "public"."rls_get_member_org_id"() AS "rls_get_member_org_id") = "rls_organization_id"));

CREATE POLICY "Allow org members to select" ON "public"."metering_hardware_install_sessions" FOR SELECT TO "authenticated" USING ((( SELECT "public"."rls_get_member_org_id"() AS "rls_get_member_org_id") = "rls_organization_id"));

CREATE POLICY "Allow org members to select" ON "public"."mppts" FOR SELECT TO "authenticated" USING ((( SELECT "public"."rls_get_member_org_id"() AS "rls_get_member_org_id") = "rls_organization_id"));

CREATE POLICY "Allow org members to select" ON "public"."notes" FOR SELECT TO "authenticated" USING ((( SELECT "public"."rls_get_member_org_id"() AS "rls_get_member_org_id") = "rls_organization_id"));

CREATE POLICY "Allow org members to select" ON "public"."orders" FOR SELECT TO "authenticated" USING ((( SELECT "public"."rls_get_member_org_id"() AS "rls_get_member_org_id") = "rls_organization_id"));

CREATE POLICY "Allow org members to select" ON "public"."organizations" FOR SELECT TO "authenticated" USING ((( SELECT "public"."rls_get_member_org_id"() AS "rls_get_member_org_id") = "id"));

CREATE POLICY "Allow org members to select" ON "public"."poles" FOR SELECT TO "authenticated" USING ((( SELECT "public"."rls_get_member_org_id"() AS "rls_get_member_org_id") = "rls_organization_id"));

CREATE POLICY "Allow org members to select" ON "public"."routers" FOR SELECT TO "authenticated" USING ((( SELECT "public"."rls_get_member_org_id"() AS "rls_get_member_org_id") = "rls_organization_id"));

CREATE POLICY "Allow org members to select" ON "public"."transactions" FOR SELECT TO "authenticated" USING ((( SELECT "public"."rls_get_member_org_id"() AS "rls_get_member_org_id") = "rls_organization_id"));

CREATE POLICY "Allow org members to select (TEMPORARILY OPEN)" ON "public"."wallets" FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "Allow org members to select own and UNASSIGNED" ON "public"."meters" FOR SELECT TO "authenticated" USING ((("rls_organization_id" IS NULL) OR (( SELECT "public"."rls_get_member_org_id"() AS "rls_get_member_org_id") = "rls_organization_id")));

CREATE POLICY "Allow org members to update" ON "public"."accounts" FOR UPDATE TO "authenticated" USING (("public"."rls_get_member_org_id"() = "organization_id"));

CREATE POLICY "Allow org members to update" ON "public"."orders" FOR UPDATE TO "authenticated" USING (("public"."rls_get_member_org_id"() = "rls_organization_id"));

CREATE POLICY "Allow public selects (temporary for sending response to MAKE)" ON "public"."pd_site_submissions" FOR SELECT USING (true);

CREATE POLICY "Allow public writes (Sites can be submitted publicly)" ON "public"."pd_site_submissions" FOR INSERT WITH CHECK (true);

ALTER TABLE "public"."accounts" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."agents" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."api_keys" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."audits" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."autopilot_executions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."bank_accounts" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."banks" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."connection_requested_meters" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."connections" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."dcus" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."device_logs" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."device_types" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."devices" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."directive_batch_executions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."directive_batches" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."directive_watchdog_sessions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."directives" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."energy_cabins" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."features" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."grids" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."issues" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."lorawan_directives" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."member_feature" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."members" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."meter_commissionings" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."meter_credit_transfers" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."meter_interactions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."metering_hardware_imports" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."metering_hardware_install_sessions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."meters" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."migrations" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."mppts" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."notes" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."notification_parameters" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."payouts" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."pd_action_templates" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."pd_actions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."pd_audits" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."pd_document_templates" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."pd_documents" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."pd_flow_templates" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."pd_flows" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."pd_section_templates" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."pd_sections" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."pd_site_submissions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."pd_sites" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."poles" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."routers" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."solcast_cache" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."ussd_session_hops" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."ussd_sessions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."wallets" ENABLE ROW LEVEL SECURITY;

ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."customers";

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."dcus";

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."device_logs";

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."devices";

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."directives";

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."grids";

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."lorawan_directives";

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."meter_commissionings";

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."meter_interactions";

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."metering_hardware_imports";

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."meters";

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."orders";

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."wallets";

GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

GRANT ALL ON FUNCTION "public"."append_rls_organization_id_by_account_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."append_rls_organization_id_by_account_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."append_rls_organization_id_by_account_id"() TO "service_role";

GRANT ALL ON FUNCTION "public"."append_rls_organization_id_by_connection_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."append_rls_organization_id_by_connection_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."append_rls_organization_id_by_connection_id"() TO "service_role";

GRANT ALL ON FUNCTION "public"."append_rls_organization_id_by_customer_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."append_rls_organization_id_by_customer_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."append_rls_organization_id_by_customer_id"() TO "service_role";

GRANT ALL ON FUNCTION "public"."append_rls_organization_id_by_customer_id_or_agent_id_or_connec"() TO "anon";
GRANT ALL ON FUNCTION "public"."append_rls_organization_id_by_customer_id_or_agent_id_or_connec"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."append_rls_organization_id_by_customer_id_or_agent_id_or_connec"() TO "service_role";

GRANT ALL ON FUNCTION "public"."append_rls_organization_id_by_dcu_id_or_meter_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."append_rls_organization_id_by_dcu_id_or_meter_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."append_rls_organization_id_by_dcu_id_or_meter_id"() TO "service_role";

GRANT ALL ON FUNCTION "public"."append_rls_organization_id_by_device_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."append_rls_organization_id_by_device_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."append_rls_organization_id_by_device_id"() TO "service_role";

GRANT ALL ON FUNCTION "public"."append_rls_organization_id_by_directive_batch_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."append_rls_organization_id_by_directive_batch_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."append_rls_organization_id_by_directive_batch_id"() TO "service_role";

GRANT ALL ON FUNCTION "public"."append_rls_organization_id_by_grid_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."append_rls_organization_id_by_grid_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."append_rls_organization_id_by_grid_id"() TO "service_role";

GRANT ALL ON FUNCTION "public"."append_rls_organization_id_by_historical_grid_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."append_rls_organization_id_by_historical_grid_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."append_rls_organization_id_by_historical_grid_id"() TO "service_role";

GRANT ALL ON FUNCTION "public"."append_rls_organization_id_by_meter_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."append_rls_organization_id_by_meter_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."append_rls_organization_id_by_meter_id"() TO "service_role";

GRANT ALL ON FUNCTION "public"."append_rls_organization_id_by_metering_hardware_install_session"() TO "anon";
GRANT ALL ON FUNCTION "public"."append_rls_organization_id_by_metering_hardware_install_session"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."append_rls_organization_id_by_metering_hardware_install_session"() TO "service_role";

GRANT ALL ON FUNCTION "public"."append_rls_organization_id_by_order_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."append_rls_organization_id_by_order_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."append_rls_organization_id_by_order_id"() TO "service_role";

GRANT ALL ON FUNCTION "public"."append_rls_organization_id_by_receiver_meter_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."append_rls_organization_id_by_receiver_meter_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."append_rls_organization_id_by_receiver_meter_id"() TO "service_role";

GRANT ALL ON FUNCTION "public"."find_energy_topup_revenue"("grid_id" integer, "start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."find_energy_topup_revenue"("grid_id" integer, "start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."find_energy_topup_revenue"("grid_id" integer, "start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "service_role";

GRANT ALL ON FUNCTION "public"."find_top_spenders"("grid_id" integer, "limit_count" integer, "start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."find_top_spenders"("grid_id" integer, "limit_count" integer, "start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."find_top_spenders"("grid_id" integer, "limit_count" integer, "start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "service_role";

GRANT ALL ON FUNCTION "public"."get_grid_status"("grid_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_grid_status"("grid_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_grid_status"("grid_id" integer) TO "service_role";

GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";

GRANT ALL ON FUNCTION "public"."handle_update_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_update_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_update_user"() TO "service_role";

GRANT ALL ON FUNCTION "public"."lock_next_order"("uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."lock_next_order"("uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."lock_next_order"("uuid" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."lock_next_pd_action"() TO "anon";
GRANT ALL ON FUNCTION "public"."lock_next_pd_action"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."lock_next_pd_action"() TO "service_role";

GRANT ALL ON FUNCTION "public"."notify_make_about_is_fs_on_updated"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_make_about_is_fs_on_updated"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_make_about_is_fs_on_updated"() TO "service_role";

GRANT ALL ON FUNCTION "public"."notify_make_about_is_hps_on_updated"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_make_about_is_hps_on_updated"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_make_about_is_hps_on_updated"() TO "service_role";

GRANT ALL ON FUNCTION "public"."notify_make_about_kwh_tariff_essential_service_updated"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_make_about_kwh_tariff_essential_service_updated"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_make_about_kwh_tariff_essential_service_updated"() TO "service_role";

GRANT ALL ON FUNCTION "public"."rls_check_if_lender"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_check_if_lender"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_check_if_lender"() TO "service_role";

GRANT ALL ON FUNCTION "public"."rls_check_if_nxt_member"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_check_if_nxt_member"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_check_if_nxt_member"() TO "service_role";

GRANT ALL ON FUNCTION "public"."rls_get_member_org_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_get_member_org_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_get_member_org_id"() TO "service_role";

GRANT ALL ON TABLE "public"."accounts" TO "anon";
GRANT ALL ON TABLE "public"."accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."accounts" TO "service_role";

GRANT ALL ON SEQUENCE "public"."accounts_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."accounts_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."accounts_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."agents" TO "anon";
GRANT ALL ON TABLE "public"."agents" TO "authenticated";
GRANT ALL ON TABLE "public"."agents" TO "service_role";

GRANT ALL ON SEQUENCE "public"."agents_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."agents_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."agents_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."agents_with_account" TO "anon";
GRANT ALL ON TABLE "public"."agents_with_account" TO "authenticated";
GRANT ALL ON TABLE "public"."agents_with_account" TO "service_role";

GRANT ALL ON TABLE "public"."api_keys" TO "anon";
GRANT ALL ON TABLE "public"."api_keys" TO "authenticated";
GRANT ALL ON TABLE "public"."api_keys" TO "service_role";

GRANT ALL ON SEQUENCE "public"."api_keys_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."api_keys_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."api_keys_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."audits" TO "anon";
GRANT ALL ON TABLE "public"."audits" TO "authenticated";
GRANT ALL ON TABLE "public"."audits" TO "service_role";

GRANT ALL ON SEQUENCE "public"."audits_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."audits_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."audits_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."autopilot_executions" TO "anon";
GRANT ALL ON TABLE "public"."autopilot_executions" TO "authenticated";
GRANT ALL ON TABLE "public"."autopilot_executions" TO "service_role";

GRANT ALL ON SEQUENCE "public"."autopilot_executions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."autopilot_executions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."autopilot_executions_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."bank_accounts" TO "anon";
GRANT ALL ON TABLE "public"."bank_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."bank_accounts" TO "service_role";

GRANT ALL ON SEQUENCE "public"."bank_accounts_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."bank_accounts_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."bank_accounts_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."banks" TO "anon";
GRANT ALL ON TABLE "public"."banks" TO "authenticated";
GRANT ALL ON TABLE "public"."banks" TO "service_role";

GRANT ALL ON SEQUENCE "public"."banks_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."banks_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."banks_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."dcus" TO "anon";
GRANT ALL ON TABLE "public"."dcus" TO "authenticated";
GRANT ALL ON TABLE "public"."dcus" TO "service_role";

GRANT ALL ON TABLE "public"."directives" TO "anon";
GRANT ALL ON TABLE "public"."directives" TO "authenticated";
GRANT ALL ON TABLE "public"."directives" TO "service_role";

GRANT ALL ON TABLE "public"."lorawan_directives" TO "anon";
GRANT ALL ON TABLE "public"."lorawan_directives" TO "authenticated";
GRANT ALL ON TABLE "public"."lorawan_directives" TO "service_role";

GRANT ALL ON TABLE "public"."meters" TO "anon";
GRANT ALL ON TABLE "public"."meters" TO "authenticated";
GRANT ALL ON TABLE "public"."meters" TO "service_role";

GRANT ALL ON TABLE "public"."poles" TO "anon";
GRANT ALL ON TABLE "public"."poles" TO "authenticated";
GRANT ALL ON TABLE "public"."poles" TO "service_role";

GRANT ALL ON TABLE "public"."batch_commands" TO "anon";
GRANT ALL ON TABLE "public"."batch_commands" TO "authenticated";
GRANT ALL ON TABLE "public"."batch_commands" TO "service_role";

GRANT ALL ON TABLE "public"."connection_requested_meters" TO "anon";
GRANT ALL ON TABLE "public"."connection_requested_meters" TO "authenticated";
GRANT ALL ON TABLE "public"."connection_requested_meters" TO "service_role";

GRANT ALL ON SEQUENCE "public"."connection_requested_meters_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."connection_requested_meters_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."connection_requested_meters_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."connections" TO "anon";
GRANT ALL ON TABLE "public"."connections" TO "authenticated";
GRANT ALL ON TABLE "public"."connections" TO "service_role";

GRANT ALL ON SEQUENCE "public"."connections_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."connections_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."connections_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";

GRANT ALL ON SEQUENCE "public"."customers_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."customers_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."customers_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."customers_with_account" TO "anon";
GRANT ALL ON TABLE "public"."customers_with_account" TO "authenticated";
GRANT ALL ON TABLE "public"."customers_with_account" TO "service_role";

GRANT ALL ON SEQUENCE "public"."dcus_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."dcus_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."dcus_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."device_logs" TO "anon";
GRANT ALL ON TABLE "public"."device_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."device_logs" TO "service_role";

GRANT ALL ON SEQUENCE "public"."device_logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."device_logs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."device_logs_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."device_types" TO "anon";
GRANT ALL ON TABLE "public"."device_types" TO "authenticated";
GRANT ALL ON TABLE "public"."device_types" TO "service_role";

GRANT ALL ON SEQUENCE "public"."device_types_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."device_types_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."device_types_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."devices" TO "anon";
GRANT ALL ON TABLE "public"."devices" TO "authenticated";
GRANT ALL ON TABLE "public"."devices" TO "service_role";

GRANT ALL ON SEQUENCE "public"."devices_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."devices_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."devices_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."directive_batch_executions" TO "anon";
GRANT ALL ON TABLE "public"."directive_batch_executions" TO "authenticated";
GRANT ALL ON TABLE "public"."directive_batch_executions" TO "service_role";

GRANT ALL ON SEQUENCE "public"."directive_batch_executions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."directive_batch_executions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."directive_batch_executions_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."directive_batches" TO "anon";
GRANT ALL ON TABLE "public"."directive_batches" TO "authenticated";
GRANT ALL ON TABLE "public"."directive_batches" TO "service_role";

GRANT ALL ON SEQUENCE "public"."directive_batches_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."directive_batches_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."directive_batches_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."directive_watchdog_sessions" TO "anon";
GRANT ALL ON TABLE "public"."directive_watchdog_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."directive_watchdog_sessions" TO "service_role";

GRANT ALL ON SEQUENCE "public"."directive_watchdog_sessions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."directive_watchdog_sessions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."directive_watchdog_sessions_id_seq" TO "service_role";

GRANT ALL ON SEQUENCE "public"."directives_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."directives_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."directives_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."energy_cabins" TO "anon";
GRANT ALL ON TABLE "public"."energy_cabins" TO "authenticated";
GRANT ALL ON TABLE "public"."energy_cabins" TO "service_role";

GRANT ALL ON SEQUENCE "public"."energy_cabins_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."energy_cabins_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."energy_cabins_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."features" TO "anon";
GRANT ALL ON TABLE "public"."features" TO "authenticated";
GRANT ALL ON TABLE "public"."features" TO "service_role";

GRANT ALL ON SEQUENCE "public"."features_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."features_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."features_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."grids" TO "anon";
GRANT ALL ON TABLE "public"."grids" TO "authenticated";
GRANT ALL ON TABLE "public"."grids" TO "service_role";

GRANT ALL ON SEQUENCE "public"."grids_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."grids_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."grids_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."issues" TO "anon";
GRANT ALL ON TABLE "public"."issues" TO "authenticated";
GRANT ALL ON TABLE "public"."issues" TO "service_role";

GRANT ALL ON SEQUENCE "public"."issues_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."issues_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."issues_id_seq" TO "service_role";

GRANT ALL ON SEQUENCE "public"."lorawan_directives_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."lorawan_directives_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."lorawan_directives_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."member_feature" TO "anon";
GRANT ALL ON TABLE "public"."member_feature" TO "authenticated";
GRANT ALL ON TABLE "public"."member_feature" TO "service_role";

GRANT ALL ON TABLE "public"."members" TO "anon";
GRANT ALL ON TABLE "public"."members" TO "authenticated";
GRANT ALL ON TABLE "public"."members" TO "service_role";

GRANT ALL ON SEQUENCE "public"."members_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."members_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."members_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."meter_commissionings" TO "anon";
GRANT ALL ON TABLE "public"."meter_commissionings" TO "authenticated";
GRANT ALL ON TABLE "public"."meter_commissionings" TO "service_role";

GRANT ALL ON SEQUENCE "public"."meter_commissionings_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."meter_commissionings_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."meter_commissionings_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."meter_credit_transfers" TO "anon";
GRANT ALL ON TABLE "public"."meter_credit_transfers" TO "authenticated";
GRANT ALL ON TABLE "public"."meter_credit_transfers" TO "service_role";

GRANT ALL ON SEQUENCE "public"."meter_credit_transfers_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."meter_credit_transfers_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."meter_credit_transfers_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."meter_interactions" TO "anon";
GRANT ALL ON TABLE "public"."meter_interactions" TO "authenticated";
GRANT ALL ON TABLE "public"."meter_interactions" TO "service_role";

GRANT ALL ON SEQUENCE "public"."meter_interactions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."meter_interactions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."meter_interactions_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."metering_hardware_imports" TO "anon";
GRANT ALL ON TABLE "public"."metering_hardware_imports" TO "authenticated";
GRANT ALL ON TABLE "public"."metering_hardware_imports" TO "service_role";

GRANT ALL ON SEQUENCE "public"."metering_hardware_imports_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."metering_hardware_imports_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."metering_hardware_imports_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."metering_hardware_install_sessions" TO "anon";
GRANT ALL ON TABLE "public"."metering_hardware_install_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."metering_hardware_install_sessions" TO "service_role";

GRANT ALL ON SEQUENCE "public"."metering_hardware_install_sessions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."metering_hardware_install_sessions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."metering_hardware_install_sessions_id_seq" TO "service_role";

GRANT ALL ON SEQUENCE "public"."meters_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."meters_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."meters_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."meters_with_account_and_statuses" TO "anon";
GRANT ALL ON TABLE "public"."meters_with_account_and_statuses" TO "authenticated";
GRANT ALL ON TABLE "public"."meters_with_account_and_statuses" TO "service_role";

GRANT ALL ON TABLE "public"."migrations" TO "anon";
GRANT ALL ON TABLE "public"."migrations" TO "authenticated";
GRANT ALL ON TABLE "public"."migrations" TO "service_role";

GRANT ALL ON SEQUENCE "public"."migrations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."migrations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."migrations_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."mppts" TO "anon";
GRANT ALL ON TABLE "public"."mppts" TO "authenticated";
GRANT ALL ON TABLE "public"."mppts" TO "service_role";

GRANT ALL ON SEQUENCE "public"."mppts_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."mppts_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."mppts_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."notes" TO "anon";
GRANT ALL ON TABLE "public"."notes" TO "authenticated";
GRANT ALL ON TABLE "public"."notes" TO "service_role";

GRANT ALL ON SEQUENCE "public"."notes_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."notes_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."notes_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."notification_parameters" TO "anon";
GRANT ALL ON TABLE "public"."notification_parameters" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_parameters" TO "service_role";

GRANT ALL ON SEQUENCE "public"."notification_parameters_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."notification_parameters_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."notification_parameters_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";

GRANT ALL ON SEQUENCE "public"."notifications_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."notifications_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."notifications_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";

GRANT ALL ON SEQUENCE "public"."orders_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."orders_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."orders_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";

GRANT ALL ON SEQUENCE "public"."organizations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."organizations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."organizations_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."payouts" TO "anon";
GRANT ALL ON TABLE "public"."payouts" TO "authenticated";
GRANT ALL ON TABLE "public"."payouts" TO "service_role";

GRANT ALL ON SEQUENCE "public"."payouts_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."payouts_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."payouts_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."pd_action_templates" TO "anon";
GRANT ALL ON TABLE "public"."pd_action_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."pd_action_templates" TO "service_role";

GRANT ALL ON SEQUENCE "public"."pd_action_templates_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pd_action_templates_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pd_action_templates_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."pd_actions" TO "anon";
GRANT ALL ON TABLE "public"."pd_actions" TO "authenticated";
GRANT ALL ON TABLE "public"."pd_actions" TO "service_role";

GRANT ALL ON SEQUENCE "public"."pd_actions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pd_actions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pd_actions_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."pd_audits" TO "anon";
GRANT ALL ON TABLE "public"."pd_audits" TO "authenticated";
GRANT ALL ON TABLE "public"."pd_audits" TO "service_role";

GRANT ALL ON SEQUENCE "public"."pd_audits_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pd_audits_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pd_audits_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."pd_document_templates" TO "anon";
GRANT ALL ON TABLE "public"."pd_document_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."pd_document_templates" TO "service_role";

GRANT ALL ON SEQUENCE "public"."pd_document_templates_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pd_document_templates_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pd_document_templates_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."pd_documents" TO "anon";
GRANT ALL ON TABLE "public"."pd_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."pd_documents" TO "service_role";

GRANT ALL ON SEQUENCE "public"."pd_documents_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pd_documents_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pd_documents_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."pd_flow_templates" TO "anon";
GRANT ALL ON TABLE "public"."pd_flow_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."pd_flow_templates" TO "service_role";

GRANT ALL ON SEQUENCE "public"."pd_flow_templates_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pd_flow_templates_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pd_flow_templates_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."pd_flows" TO "anon";
GRANT ALL ON TABLE "public"."pd_flows" TO "authenticated";
GRANT ALL ON TABLE "public"."pd_flows" TO "service_role";

GRANT ALL ON SEQUENCE "public"."pd_flows_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pd_flows_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pd_flows_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."pd_section_templates" TO "anon";
GRANT ALL ON TABLE "public"."pd_section_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."pd_section_templates" TO "service_role";

GRANT ALL ON SEQUENCE "public"."pd_section_templates_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pd_section_templates_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pd_section_templates_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."pd_sections" TO "anon";
GRANT ALL ON TABLE "public"."pd_sections" TO "authenticated";
GRANT ALL ON TABLE "public"."pd_sections" TO "service_role";

GRANT ALL ON SEQUENCE "public"."pd_sections_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pd_sections_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pd_sections_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."pd_site_submissions" TO "anon";
GRANT ALL ON TABLE "public"."pd_site_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."pd_site_submissions" TO "service_role";

GRANT ALL ON SEQUENCE "public"."pd_site_submissions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pd_site_submissions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pd_site_submissions_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."pd_sites" TO "anon";
GRANT ALL ON TABLE "public"."pd_sites" TO "authenticated";
GRANT ALL ON TABLE "public"."pd_sites" TO "service_role";

GRANT ALL ON SEQUENCE "public"."pd_sites_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pd_sites_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pd_sites_id_seq" TO "service_role";

GRANT ALL ON SEQUENCE "public"."poles_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."poles_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."poles_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."routers" TO "anon";
GRANT ALL ON TABLE "public"."routers" TO "authenticated";
GRANT ALL ON TABLE "public"."routers" TO "service_role";

GRANT ALL ON SEQUENCE "public"."routers_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."routers_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."routers_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."solcast_cache" TO "anon";
GRANT ALL ON TABLE "public"."solcast_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."solcast_cache" TO "service_role";

GRANT ALL ON SEQUENCE "public"."solcast_cache_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."solcast_cache_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."solcast_cache_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."transactions" TO "anon";
GRANT ALL ON TABLE "public"."transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions" TO "service_role";

GRANT ALL ON SEQUENCE "public"."transactions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."transactions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."transactions_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."ussd_session_hops" TO "anon";
GRANT ALL ON TABLE "public"."ussd_session_hops" TO "authenticated";
GRANT ALL ON TABLE "public"."ussd_session_hops" TO "service_role";

GRANT ALL ON SEQUENCE "public"."ussd_session_hops_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ussd_session_hops_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ussd_session_hops_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."ussd_sessions" TO "anon";
GRANT ALL ON TABLE "public"."ussd_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."ussd_sessions" TO "service_role";

GRANT ALL ON SEQUENCE "public"."ussd_sessions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ussd_sessions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ussd_sessions_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."wallets" TO "anon";
GRANT ALL ON TABLE "public"."wallets" TO "authenticated";
GRANT ALL ON TABLE "public"."wallets" TO "service_role";

GRANT ALL ON SEQUENCE "public"."wallets_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."wallets_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."wallets_id_seq" TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";


-- **
-- * MANUAL EDIT :: Add triggers on users table in auth schema
-- **

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
CREATE TRIGGER on_auth_user_updated AFTER UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_update_user();
