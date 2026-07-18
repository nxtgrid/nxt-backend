CREATE TRIGGER append_rls_organization_id_on_agent_insert BEFORE INSERT ON public.agents FOR EACH ROW EXECUTE FUNCTION public.append_rls_organization_id_by_grid_id();

CREATE TRIGGER append_rls_organization_id_on_connection_insert BEFORE INSERT ON public.connections FOR EACH ROW EXECUTE FUNCTION public.append_rls_organization_id_by_customer_id();

CREATE TRIGGER append_rls_organization_id_on_customer_insert BEFORE INSERT ON public.customers FOR EACH ROW EXECUTE FUNCTION public.append_rls_organization_id_by_grid_id();

CREATE TRIGGER append_rls_organization_id_on_dcus_insert BEFORE INSERT ON public.dcus FOR EACH ROW EXECUTE FUNCTION public.append_rls_organization_id_by_grid_id();

CREATE TRIGGER append_rls_organization_id_on_meter_command_batch_execution_insert BEFORE INSERT ON public.meter_command_batch_executions FOR EACH ROW EXECUTE FUNCTION public.append_rls_organization_id_by_meter_command_batch_id();

CREATE TRIGGER append_rls_organization_id_on_meter_command_batch_insert BEFORE INSERT ON public.meter_command_batches FOR EACH ROW EXECUTE FUNCTION public.append_rls_organization_id_by_grid_id();

CREATE TRIGGER append_rls_organization_id_on_energy_cabin_insert BEFORE INSERT ON public.energy_cabins FOR EACH ROW EXECUTE FUNCTION public.append_rls_organization_id_by_grid_id();

CREATE TRIGGER append_rls_organization_id_on_issue_insert BEFORE INSERT ON public.issues FOR EACH ROW EXECUTE FUNCTION public.append_rls_organization_id_by_meter_id();

CREATE TRIGGER append_rls_organization_id_on_member_insert BEFORE INSERT ON public.members FOR EACH ROW EXECUTE FUNCTION public.append_rls_organization_id_by_account_id();

CREATE TRIGGER append_rls_organization_id_on_meter_commissioning_insert BEFORE INSERT ON public.meter_commissionings FOR EACH ROW EXECUTE FUNCTION public.append_rls_organization_id_by_metering_hardware_install_session();

CREATE TRIGGER append_rls_organization_id_on_meter_insert BEFORE INSERT ON public.meters FOR EACH ROW EXECUTE FUNCTION public.append_rls_organization_id_by_connection_id();

CREATE TRIGGER append_rls_organization_id_on_meter_install_session_insert BEFORE INSERT ON public.metering_hardware_install_sessions FOR EACH ROW EXECUTE FUNCTION public.append_rls_organization_id_by_dcu_id_or_meter_id();

CREATE TRIGGER append_rls_organization_id_on_mppt_insert BEFORE INSERT ON public.mppts FOR EACH ROW EXECUTE FUNCTION public.append_rls_organization_id_by_grid_id();

CREATE TRIGGER append_rls_organization_id_on_note_insert BEFORE INSERT ON public.notes FOR EACH ROW EXECUTE FUNCTION public.append_rls_organization_id_by_customer_id();

CREATE TRIGGER append_rls_organization_id_on_pole_insert BEFORE INSERT ON public.poles FOR EACH ROW EXECUTE FUNCTION public.append_rls_organization_id_by_grid_id();

CREATE TRIGGER append_rls_organization_id_on_requested_connection_meters_inser BEFORE INSERT ON public.connection_requested_meters FOR EACH ROW EXECUTE FUNCTION public.append_rls_organization_id_by_connection_id();

CREATE TRIGGER append_rls_organization_id_on_router_insert BEFORE INSERT ON public.routers FOR EACH ROW EXECUTE FUNCTION public.append_rls_organization_id_by_grid_id();

CREATE TRIGGER append_rls_organization_id_on_transaction_insert BEFORE INSERT ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.append_rls_organization_id_by_order_id();

CREATE TRIGGER append_rls_organization_id_on_wallet_insert BEFORE INSERT ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.append_rls_organization_id_by_customer_id_or_agent_id_or_connec();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_updated AFTER UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_update_user();
