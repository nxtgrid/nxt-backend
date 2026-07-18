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
