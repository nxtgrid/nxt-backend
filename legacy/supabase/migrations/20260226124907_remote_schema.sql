create extension if not exists "hypopg" with schema "extensions";

create extension if not exists "index_advisor" with schema "extensions";

alter table "public"."meter_interactions" alter column "meter_interaction_status" drop default;

alter type "public"."meter_interaction_status_enum" rename to "meter_interaction_status_enum__old_version_to_be_dropped";

create type "public"."meter_interaction_status_enum" as enum ('QUEUED', 'ABORTED', 'PROCESSING', 'SUCCESSFUL', 'FAILED', 'DEFERRED', 'SUSPENDED');

alter table "public"."meter_interactions" alter column meter_interaction_status type "public"."meter_interaction_status_enum" using meter_interaction_status::text::"public"."meter_interaction_status_enum";

alter table "public"."meter_interactions" alter column "meter_interaction_status" set default 'QUEUED'::public.meter_interaction_status_enum;

drop type "public"."meter_interaction_status_enum__old_version_to_be_dropped";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_grid_status(grid_id integer)
 RETURNS TABLE(is_hps_on boolean, is_fs_on boolean, are_all_dcus_online boolean, are_all_dcus_under_high_load_threshold boolean, is_cabin_meter_credit_depleting boolean, customer_count integer)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$BEGIN
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
END;$function$
;
