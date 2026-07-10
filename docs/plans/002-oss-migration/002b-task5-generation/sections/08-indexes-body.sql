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
