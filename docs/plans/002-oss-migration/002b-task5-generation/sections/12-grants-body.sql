GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.accounts TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.accounts TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.accounts TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.agents TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.agents TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.agents TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.agents_with_account TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.agents_with_account TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.agents_with_account TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.api_keys TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.api_keys TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.api_keys TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.audits TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.audits TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.audits TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.banks TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.banks TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.banks TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.dcus TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.dcus TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.dcus TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.meters TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.meters TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.meters TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.poles TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.poles TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.poles TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.connection_requested_meters TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.connection_requested_meters TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.connection_requested_meters TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.connections TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.connections TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.connections TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.customers TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.customers TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.customers TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.customers_with_account TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.customers_with_account TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.customers_with_account TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.meter_command_batch_executions TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.meter_command_batch_executions TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.meter_command_batch_executions TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.meter_command_batches TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.meter_command_batches TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.meter_command_batches TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.energy_cabins TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.energy_cabins TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.energy_cabins TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.grids TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.grids TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.grids TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.issues TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.issues TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.issues TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.members TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.members TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.members TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.meter_commissionings TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.meter_commissionings TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.meter_commissionings TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.meter_interactions TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.meter_interactions TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.meter_interactions TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.metering_hardware_imports TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.metering_hardware_imports TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.metering_hardware_imports TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.metering_hardware_install_sessions TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.metering_hardware_install_sessions TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.metering_hardware_install_sessions TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.meters_with_account_and_statuses TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.meters_with_account_and_statuses TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.meters_with_account_and_statuses TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.mppts TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.mppts TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.mppts TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.notes TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.notes TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.notes TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.notification_parameters TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.notification_parameters TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.notification_parameters TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.notifications TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.notifications TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.notifications TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.orders TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.orders TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.orders TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.organizations TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.organizations TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.organizations TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.pd_site_submissions TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.pd_site_submissions TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.pd_site_submissions TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.pd_sites TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.pd_sites TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.pd_sites TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.routers TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.routers TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.routers TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.solcast_cache TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.solcast_cache TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.solcast_cache TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.transactions TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.transactions TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.transactions TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.ussd_session_hops TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.ussd_session_hops TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.ussd_session_hops TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.ussd_sessions TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.ussd_sessions TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.ussd_sessions TO service_role;

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.wallets TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.wallets TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.wallets TO service_role;

GRANT ALL ON SEQUENCE public.accounts_id_seq TO anon;
GRANT ALL ON SEQUENCE public.accounts_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.accounts_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.agents_id_seq TO anon;
GRANT ALL ON SEQUENCE public.agents_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.agents_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.api_keys_id_seq TO anon;
GRANT ALL ON SEQUENCE public.api_keys_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.api_keys_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.audits_id_seq TO anon;
GRANT ALL ON SEQUENCE public.audits_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.audits_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.banks_id_seq TO anon;
GRANT ALL ON SEQUENCE public.banks_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.banks_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.connection_requested_meters_id_seq TO anon;
GRANT ALL ON SEQUENCE public.connection_requested_meters_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.connection_requested_meters_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.connections_id_seq TO anon;
GRANT ALL ON SEQUENCE public.connections_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.connections_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.customers_id_seq TO anon;
GRANT ALL ON SEQUENCE public.customers_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.customers_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.dcus_id_seq TO anon;
GRANT ALL ON SEQUENCE public.dcus_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.dcus_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.meter_command_batch_executions_id_seq TO anon;
GRANT ALL ON SEQUENCE public.meter_command_batch_executions_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.meter_command_batch_executions_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.meter_command_batches_id_seq TO anon;
GRANT ALL ON SEQUENCE public.meter_command_batches_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.meter_command_batches_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.energy_cabins_id_seq TO anon;
GRANT ALL ON SEQUENCE public.energy_cabins_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.energy_cabins_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.grids_id_seq TO anon;
GRANT ALL ON SEQUENCE public.grids_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.grids_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.issues_id_seq TO anon;
GRANT ALL ON SEQUENCE public.issues_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.issues_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.members_id_seq TO anon;
GRANT ALL ON SEQUENCE public.members_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.members_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.meter_commissionings_id_seq TO anon;
GRANT ALL ON SEQUENCE public.meter_commissionings_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.meter_commissionings_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.meter_interactions_id_seq TO anon;
GRANT ALL ON SEQUENCE public.meter_interactions_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.meter_interactions_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.metering_hardware_imports_id_seq TO anon;
GRANT ALL ON SEQUENCE public.metering_hardware_imports_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.metering_hardware_imports_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.metering_hardware_install_sessions_id_seq TO anon;
GRANT ALL ON SEQUENCE public.metering_hardware_install_sessions_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.metering_hardware_install_sessions_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.meters_id_seq TO anon;
GRANT ALL ON SEQUENCE public.meters_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.meters_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.mppts_id_seq TO anon;
GRANT ALL ON SEQUENCE public.mppts_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.mppts_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.notes_id_seq TO anon;
GRANT ALL ON SEQUENCE public.notes_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.notes_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.notification_parameters_id_seq TO anon;
GRANT ALL ON SEQUENCE public.notification_parameters_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.notification_parameters_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.notifications_id_seq TO anon;
GRANT ALL ON SEQUENCE public.notifications_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.notifications_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.orders_id_seq TO anon;
GRANT ALL ON SEQUENCE public.orders_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.orders_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.organizations_id_seq TO anon;
GRANT ALL ON SEQUENCE public.organizations_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.organizations_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.pd_site_submissions_id_seq TO anon;
GRANT ALL ON SEQUENCE public.pd_site_submissions_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.pd_site_submissions_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.pd_sites_id_seq TO anon;
GRANT ALL ON SEQUENCE public.pd_sites_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.pd_sites_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.poles_id_seq TO anon;
GRANT ALL ON SEQUENCE public.poles_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.poles_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.routers_id_seq TO anon;
GRANT ALL ON SEQUENCE public.routers_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.routers_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.solcast_cache_id_seq TO anon;
GRANT ALL ON SEQUENCE public.solcast_cache_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.solcast_cache_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.transactions_id_seq TO anon;
GRANT ALL ON SEQUENCE public.transactions_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.transactions_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.ussd_session_hops_id_seq TO anon;
GRANT ALL ON SEQUENCE public.ussd_session_hops_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.ussd_session_hops_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.ussd_sessions_id_seq TO anon;
GRANT ALL ON SEQUENCE public.ussd_sessions_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.ussd_sessions_id_seq TO service_role;

GRANT ALL ON SEQUENCE public.wallets_id_seq TO anon;
GRANT ALL ON SEQUENCE public.wallets_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.wallets_id_seq TO service_role;

GRANT ALL ON FUNCTION public.append_rls_organization_id_by_account_id() TO anon;
GRANT ALL ON FUNCTION public.append_rls_organization_id_by_account_id() TO authenticated;
GRANT ALL ON FUNCTION public.append_rls_organization_id_by_account_id() TO service_role;

GRANT ALL ON FUNCTION public.append_rls_organization_id_by_connection_id() TO anon;
GRANT ALL ON FUNCTION public.append_rls_organization_id_by_connection_id() TO authenticated;
GRANT ALL ON FUNCTION public.append_rls_organization_id_by_connection_id() TO service_role;

GRANT ALL ON FUNCTION public.append_rls_organization_id_by_customer_id() TO anon;
GRANT ALL ON FUNCTION public.append_rls_organization_id_by_customer_id() TO authenticated;
GRANT ALL ON FUNCTION public.append_rls_organization_id_by_customer_id() TO service_role;

GRANT ALL ON FUNCTION public.append_rls_organization_id_by_customer_id_or_agent_id_or_connec() TO anon;
GRANT ALL ON FUNCTION public.append_rls_organization_id_by_customer_id_or_agent_id_or_connec() TO authenticated;
GRANT ALL ON FUNCTION public.append_rls_organization_id_by_customer_id_or_agent_id_or_connec() TO service_role;

GRANT ALL ON FUNCTION public.append_rls_organization_id_by_dcu_id_or_meter_id() TO anon;
GRANT ALL ON FUNCTION public.append_rls_organization_id_by_dcu_id_or_meter_id() TO authenticated;
GRANT ALL ON FUNCTION public.append_rls_organization_id_by_dcu_id_or_meter_id() TO service_role;

GRANT ALL ON FUNCTION public.append_rls_organization_id_by_meter_command_batch_id() TO anon;
GRANT ALL ON FUNCTION public.append_rls_organization_id_by_meter_command_batch_id() TO authenticated;
GRANT ALL ON FUNCTION public.append_rls_organization_id_by_meter_command_batch_id() TO service_role;

GRANT ALL ON FUNCTION public.append_rls_organization_id_by_grid_id() TO anon;
GRANT ALL ON FUNCTION public.append_rls_organization_id_by_grid_id() TO authenticated;
GRANT ALL ON FUNCTION public.append_rls_organization_id_by_grid_id() TO service_role;

GRANT ALL ON FUNCTION public.append_rls_organization_id_by_meter_id() TO anon;
GRANT ALL ON FUNCTION public.append_rls_organization_id_by_meter_id() TO authenticated;
GRANT ALL ON FUNCTION public.append_rls_organization_id_by_meter_id() TO service_role;

GRANT ALL ON FUNCTION public.append_rls_organization_id_by_metering_hardware_install_session() TO anon;
GRANT ALL ON FUNCTION public.append_rls_organization_id_by_metering_hardware_install_session() TO authenticated;
GRANT ALL ON FUNCTION public.append_rls_organization_id_by_metering_hardware_install_session() TO service_role;

GRANT ALL ON FUNCTION public.append_rls_organization_id_by_order_id() TO anon;
GRANT ALL ON FUNCTION public.append_rls_organization_id_by_order_id() TO authenticated;
GRANT ALL ON FUNCTION public.append_rls_organization_id_by_order_id() TO service_role;

GRANT ALL ON FUNCTION public.find_energy_topup_revenue(grid_id integer, start_date timestamp with time zone, end_date timestamp with time zone) TO anon;
GRANT ALL ON FUNCTION public.find_energy_topup_revenue(grid_id integer, start_date timestamp with time zone, end_date timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION public.find_energy_topup_revenue(grid_id integer, start_date timestamp with time zone, end_date timestamp with time zone) TO service_role;

GRANT ALL ON FUNCTION public.find_top_spenders(grid_id integer, limit_count integer, start_date timestamp with time zone, end_date timestamp with time zone) TO anon;
GRANT ALL ON FUNCTION public.find_top_spenders(grid_id integer, limit_count integer, start_date timestamp with time zone, end_date timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION public.find_top_spenders(grid_id integer, limit_count integer, start_date timestamp with time zone, end_date timestamp with time zone) TO service_role;

GRANT ALL ON FUNCTION public.get_grid_status(grid_id integer) TO anon;
GRANT ALL ON FUNCTION public.get_grid_status(grid_id integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_grid_status(grid_id integer) TO service_role;

GRANT ALL ON FUNCTION public.handle_new_user() TO anon;
GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;

GRANT ALL ON FUNCTION public.handle_update_user() TO anon;
GRANT ALL ON FUNCTION public.handle_update_user() TO authenticated;
GRANT ALL ON FUNCTION public.handle_update_user() TO service_role;

GRANT ALL ON FUNCTION public.lock_next_order_and_wallets(uuid uuid) TO anon;
GRANT ALL ON FUNCTION public.lock_next_order_and_wallets(uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.lock_next_order_and_wallets(uuid uuid) TO service_role;

GRANT ALL ON FUNCTION public.rls_check_if_lender() TO anon;
GRANT ALL ON FUNCTION public.rls_check_if_lender() TO authenticated;
GRANT ALL ON FUNCTION public.rls_check_if_lender() TO service_role;

GRANT ALL ON FUNCTION public.rls_check_if_admin_org_member() TO anon;
GRANT ALL ON FUNCTION public.rls_check_if_admin_org_member() TO authenticated;
GRANT ALL ON FUNCTION public.rls_check_if_admin_org_member() TO service_role;

GRANT ALL ON FUNCTION public.rls_get_member_org_id() TO anon;
GRANT ALL ON FUNCTION public.rls_get_member_org_id() TO authenticated;
GRANT ALL ON FUNCTION public.rls_get_member_org_id() TO service_role;

GRANT ALL ON FUNCTION public.rls_org_id_from_grid(integer) TO anon;
GRANT ALL ON FUNCTION public.rls_org_id_from_grid(integer) TO authenticated;
GRANT ALL ON FUNCTION public.rls_org_id_from_grid(integer) TO service_role;

GRANT ALL ON FUNCTION public.rls_org_id_from_customer(integer) TO anon;
GRANT ALL ON FUNCTION public.rls_org_id_from_customer(integer) TO authenticated;
GRANT ALL ON FUNCTION public.rls_org_id_from_customer(integer) TO service_role;

GRANT ALL ON FUNCTION public.rls_org_id_from_connection(integer) TO anon;
GRANT ALL ON FUNCTION public.rls_org_id_from_connection(integer) TO authenticated;
GRANT ALL ON FUNCTION public.rls_org_id_from_connection(integer) TO service_role;

GRANT ALL ON FUNCTION public.rls_org_id_from_agent(integer) TO anon;
GRANT ALL ON FUNCTION public.rls_org_id_from_agent(integer) TO authenticated;
GRANT ALL ON FUNCTION public.rls_org_id_from_agent(integer) TO service_role;

GRANT ALL ON FUNCTION public.rls_org_id_from_meter(integer) TO anon;
GRANT ALL ON FUNCTION public.rls_org_id_from_meter(integer) TO authenticated;
GRANT ALL ON FUNCTION public.rls_org_id_from_meter(integer) TO service_role;

GRANT ALL ON FUNCTION public.rls_org_id_from_dcu(integer) TO anon;
GRANT ALL ON FUNCTION public.rls_org_id_from_dcu(integer) TO authenticated;
GRANT ALL ON FUNCTION public.rls_org_id_from_dcu(integer) TO service_role;

GRANT ALL ON FUNCTION public.sync_admin_organization_id_guc() TO anon;
GRANT ALL ON FUNCTION public.sync_admin_organization_id_guc() TO authenticated;
GRANT ALL ON FUNCTION public.sync_admin_organization_id_guc() TO service_role;
