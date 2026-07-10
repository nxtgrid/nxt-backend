-- New indexes (register #25, #30) — FK/RLS-predicate coverage gaps found while
-- auditing the legacy schema; not present in the legacy reference DB.

-- register #22 — at most one platform-operator organization (ADR-007 Amendment)
CREATE UNIQUE INDEX one_platform_operator_org ON public.organizations USING btree (organization_type) WHERE (organization_type = 'PLATFORM_OPERATOR'::public.organization_type_enum);

-- register #25 (Task 3c H1b)
CREATE INDEX idx_accounts_organization_id ON public.accounts USING btree (organization_id);

-- register #30 Tier 1 — RLS-predicate / renamed-FK gaps
CREATE INDEX idx_grids_organization_id ON public.grids USING btree (organization_id);
CREATE INDEX idx_metering_hardware_imports_rls_organization_id ON public.metering_hardware_imports USING btree (rls_organization_id);
CREATE INDEX idx_meter_command_batch_executions_meter_command_batch_id ON public.meter_command_batch_executions USING btree (meter_command_batch_id);

-- register #30 Tier 2 — plain FK-column hygiene (44 columns across 22 tables)
CREATE INDEX idx_agents_grid_id ON public.agents USING btree (grid_id);
CREATE INDEX idx_api_keys_account_id ON public.api_keys USING btree (account_id);
CREATE INDEX idx_audits_agent_id ON public.audits USING btree (agent_id);
CREATE INDEX idx_audits_author_id ON public.audits USING btree (author_id);
CREATE INDEX idx_audits_connection_id ON public.audits USING btree (connection_id);
CREATE INDEX idx_audits_customer_id ON public.audits USING btree (customer_id);
CREATE INDEX idx_audits_dcu_id ON public.audits USING btree (dcu_id);
CREATE INDEX idx_audits_grid_id ON public.audits USING btree (grid_id);
CREATE INDEX idx_audits_member_id ON public.audits USING btree (member_id);
CREATE INDEX idx_audits_meter_id ON public.audits USING btree (meter_id);
CREATE INDEX idx_audits_organization_id ON public.audits USING btree (organization_id);
CREATE INDEX idx_connection_requested_meters_connection_id ON public.connection_requested_meters USING btree (connection_id);
CREATE INDEX idx_dcus_grid_id ON public.dcus USING btree (grid_id);
CREATE INDEX idx_energy_cabins_grid_id ON public.energy_cabins USING btree (grid_id);
CREATE INDEX idx_meter_command_batches_author_id ON public.meter_command_batches USING btree (author_id);
CREATE INDEX idx_meter_command_batches_grid_id ON public.meter_command_batches USING btree (grid_id);
CREATE INDEX idx_meter_commissionings_metering_hardware_install_session_id ON public.meter_commissionings USING btree (metering_hardware_install_session_id);
CREATE INDEX idx_metering_hardware_imports_metering_hardware_install_session_id ON public.metering_hardware_imports USING btree (metering_hardware_install_session_id);
CREATE INDEX idx_metering_hardware_install_sessions_author_id ON public.metering_hardware_install_sessions USING btree (author_id);
CREATE INDEX idx_metering_hardware_install_sessions_dcu_id ON public.metering_hardware_install_sessions USING btree (dcu_id);
CREATE INDEX idx_metering_hardware_install_sessions_meter_id ON public.metering_hardware_install_sessions USING btree (meter_id);
CREATE INDEX idx_meters_pole_id ON public.meters USING btree (pole_id);
CREATE INDEX idx_mppts_grid_id ON public.mppts USING btree (grid_id);
CREATE INDEX idx_notes_author_id ON public.notes USING btree (author_id);
CREATE INDEX idx_notes_connection_id ON public.notes USING btree (connection_id);
CREATE INDEX idx_notes_customer_id ON public.notes USING btree (customer_id);
CREATE INDEX idx_notes_meter_id ON public.notes USING btree (meter_id);
CREATE INDEX idx_notifications_account_id ON public.notifications USING btree (account_id);
CREATE INDEX idx_notifications_grid_id ON public.notifications USING btree (grid_id);
CREATE INDEX idx_notifications_notification_parameter_id ON public.notifications USING btree (notification_parameter_id);
CREATE INDEX idx_notifications_organization_id ON public.notifications USING btree (organization_id);
CREATE INDEX idx_orders_author_id ON public.orders USING btree (author_id);
CREATE INDEX idx_orders_receiver_wallet_id ON public.orders USING btree (receiver_wallet_id);
CREATE INDEX idx_orders_sender_wallet_id ON public.orders USING btree (sender_wallet_id);
CREATE INDEX idx_pd_site_submissions_organization_id ON public.pd_site_submissions USING btree (organization_id);
CREATE INDEX idx_pd_sites_operations_grid_id ON public.pd_sites USING btree (operations_grid_id);
CREATE INDEX idx_pd_sites_organization_id ON public.pd_sites USING btree (organization_id);
CREATE INDEX idx_poles_grid_id ON public.poles USING btree (grid_id);
CREATE INDEX idx_routers_grid_id ON public.routers USING btree (grid_id);
CREATE INDEX idx_transactions_order_id ON public.transactions USING btree (order_id);
CREATE INDEX idx_ussd_session_hops_ussd_session_id ON public.ussd_session_hops USING btree (ussd_session_id);
CREATE INDEX idx_ussd_sessions_account_id ON public.ussd_sessions USING btree (account_id);
CREATE INDEX idx_ussd_sessions_bank_id ON public.ussd_sessions USING btree (bank_id);
CREATE INDEX idx_ussd_sessions_meter_id ON public.ussd_sessions USING btree (meter_id);
