drop policy "Allow anon" on "public"."autopilot_executions";

drop index if exists "public"."IDX_5d97e33fcf9b08d7a748d9128f";

CREATE INDEX idx_connection_customer_id ON public.connections USING btree (customer_id);

CREATE INDEX idx_customer_grid_id ON public.customers USING btree (grid_id);

CREATE INDEX idx_meter_connection_id ON public.meters USING btree (connection_id);

CREATE INDEX idx_meter_dcu_id ON public.meters USING btree (dcu_id);

CREATE INDEX idx_meter_interaction_batch_execution_id ON public.meter_interactions USING btree (batch_execution_id);

CREATE INDEX idx_meter_interaction_meter_commissioning_id ON public.meter_interactions USING btree (meter_commissioning_id);

CREATE INDEX idx_meter_interaction_meter_id ON public.meter_interactions USING btree (meter_id);
