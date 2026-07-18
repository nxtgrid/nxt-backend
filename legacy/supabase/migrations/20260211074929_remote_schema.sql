alter table "public"."directive_batch_executions" drop column "delivery_status_check_lock_session";

alter table "public"."directive_batch_executions" drop column "goldring_migration_id";

alter table "public"."directive_batches" add column "task_type" public.meter_interaction_type_enum;

alter table "public"."grids" alter column "is_hps_on_threshold_kw" set default 0;

alter table "public"."grids" alter column "is_hps_on_threshold_kw" set not null;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.lock_next_order_and_wallets(uuid uuid)
 RETURNS TABLE(id integer)
 LANGUAGE plpgsql
AS $function$
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
$function$
;
