drop index if exists "public"."idx_meter_interaction_batch_execution_id";

alter type "public"."meter_interaction_type_enum" rename to "meter_interaction_type_enum__old_version_to_be_dropped";

create type "public"."meter_interaction_type_enum" as enum ('READ_CREDIT', 'READ_POWER_LIMIT', 'READ_VOLTAGE', 'SET_POWER_LIMIT', 'TOP_UP', 'TURN_ON', 'TURN_OFF', 'READ_POWER', 'READ_CURRENT', 'CLEAR_CREDIT', 'CLEAR_TAMPER', 'READ_REPORT', 'JOIN_NETWORK', 'DELIVER_PREEXISTING_TOKEN');

alter table "public"."meter_interactions" alter column meter_interaction_type type "public"."meter_interaction_type_enum" using meter_interaction_type::text::"public"."meter_interaction_type_enum";

drop type "public"."meter_interaction_type_enum__old_version_to_be_dropped";

alter table "public"."directive_batch_executions" alter column "directive_batch_id" set not null;

alter table "public"."meter_interactions" drop column "retry_history";

alter table "public"."meter_interactions" add column "delivery_failure_history" jsonb;

CREATE INDEX idx_directives_batch_status ON public.directives USING btree (directive_batch_execution_id, directive_status);

CREATE INDEX idx_lorawan_batch_status ON public.lorawan_directives USING btree (directive_batch_execution_id, directive_status);

CREATE INDEX idx_meter_interaction_batch_execution_id ON public.meter_interactions USING btree (batch_execution_id, meter_interaction_status);

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
  -- We join the wallets so we can check their status AND lock them
  JOIN public.wallets AS sender_wallets ON sender_wallets.id = _orders.sender_wallet_id
  JOIN public.wallets AS receiver_wallets ON receiver_wallets.id = _orders.receiver_wallet_id
  WHERE
    _orders.order_status = 'PENDING'
    AND sender_wallets.lock_session IS NULL
    AND receiver_wallets.lock_session IS NULL
  ORDER BY
    _orders.id ASC
  LIMIT 1
  -- THE CRITICAL PART:
  -- This locks the specific rows found in _orders, sender_wallets, and receiver_wallets.
  -- If another transaction is touching ANY of these 3 rows, this query skips
  -- immediately to the next available order.
  FOR UPDATE OF _orders, sender_wallets, receiver_wallets SKIP LOCKED;

  -- 2. Handle Case: No eligible orders found
  IF order_id_var IS NULL THEN
    RETURN; -- Returns an empty array [] to the client
  END IF;

  -- 3. Update the Order
  UPDATE
    public.orders
  SET
    lock_session = uuid
  WHERE
    id = order_id_var;

  -- 4. Update the Wallets and Return their IDs
  RETURN QUERY
  UPDATE
    public.wallets
  SET
    lock_session = uuid
  WHERE
    id IN (sender_wallet_id_var, receiver_wallet_id_var)
  RETURNING
    public.wallets.id;
END;
$function$
;
