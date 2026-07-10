CREATE POLICY "Allow NXT Grid to CRUD" ON public.connections TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to insert" ON public.grids FOR INSERT TO authenticated WITH CHECK (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to insert" ON public.meters FOR INSERT TO authenticated WITH CHECK (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to insert" ON public.notes FOR INSERT TO authenticated WITH CHECK (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to insert" ON public.organizations FOR INSERT TO authenticated WITH CHECK (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to insert" ON public.pd_sites FOR INSERT TO authenticated WITH CHECK (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to insert" ON public.poles FOR INSERT TO authenticated WITH CHECK (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to insert" ON public.wallets FOR INSERT WITH CHECK (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to select" ON public.accounts FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to select" ON public.agents FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to select" ON public.connection_requested_meters FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to select" ON public.connections FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to select" ON public.customers FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to select" ON public.dcus FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to select" ON public.meter_command_batch_executions FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to select" ON public.meter_command_batches FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to select" ON public.energy_cabins FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to select" ON public.grids FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to select" ON public.issues FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to select" ON public.members FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to select" ON public.meter_commissionings FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to select" ON public.meter_interactions FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to select" ON public.metering_hardware_install_sessions FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to select" ON public.meters FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to select" ON public.mppts FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to select" ON public.notes FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to select" ON public.orders FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to select" ON public.organizations FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to select" ON public.pd_sites FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to select" ON public.poles FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to select" ON public.routers FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to select" ON public.transactions FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to select" ON public.wallets FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to update" ON public.accounts FOR UPDATE TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to update" ON public.connections FOR UPDATE TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to update" ON public.grids FOR UPDATE TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to update" ON public.meters FOR UPDATE TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to update" ON public.organizations FOR UPDATE TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to update" ON public.pd_site_submissions FOR UPDATE TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow NXT Grid to update" ON public.pd_sites FOR UPDATE TO authenticated USING (( SELECT public.rls_check_if_admin_org_member() AS rls_check_if_admin_org_member));

CREATE POLICY "Allow authenticated to do everything" ON public.audits USING (true);

CREATE POLICY "Allow authenticated to select" ON public.metering_hardware_imports FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authors to update their own" ON public.notes FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = ( SELECT account.supabase_id
   FROM public.accounts account
  WHERE (account.id = notes.author_id))));

CREATE POLICY "Allow lenders to select" ON public.accounts FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_lender() AS rls_check_if_lender));

CREATE POLICY "Allow lenders to select" ON public.customers FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_lender() AS rls_check_if_lender));

CREATE POLICY "Allow lenders to select" ON public.grids FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_lender() AS rls_check_if_lender));

CREATE POLICY "Allow lenders to select" ON public.orders FOR SELECT TO authenticated USING (( SELECT public.rls_check_if_lender() AS rls_check_if_lender));

CREATE POLICY "Allow org member to select" ON public.accounts FOR SELECT TO authenticated USING ((( SELECT public.rls_get_member_org_id() AS rls_get_member_org_id) = organization_id));

CREATE POLICY "Allow org members to insert" ON public.notes FOR INSERT TO authenticated WITH CHECK (( SELECT (public.rls_get_member_org_id() = rls_organization_id) AS rls_get_member_org_id));

CREATE POLICY "Allow org members to insert" ON public.poles FOR INSERT WITH CHECK (( SELECT (public.rls_get_member_org_id() = rls_organization_id) AS rls_get_member_org_id));

CREATE POLICY "Allow org members to select" ON public.agents FOR SELECT TO authenticated USING ((( SELECT public.rls_get_member_org_id() AS rls_get_member_org_id) = rls_organization_id));

CREATE POLICY "Allow org members to select" ON public.connection_requested_meters FOR SELECT TO authenticated USING ((( SELECT public.rls_get_member_org_id() AS rls_get_member_org_id) = rls_organization_id));

CREATE POLICY "Allow org members to select" ON public.connections FOR SELECT TO authenticated USING ((( SELECT public.rls_get_member_org_id() AS rls_get_member_org_id) = rls_organization_id));

CREATE POLICY "Allow org members to select" ON public.customers FOR SELECT TO authenticated USING ((( SELECT public.rls_get_member_org_id() AS rls_get_member_org_id) = rls_organization_id));

CREATE POLICY "Allow org members to select" ON public.dcus FOR SELECT TO authenticated USING ((( SELECT public.rls_get_member_org_id() AS rls_get_member_org_id) = rls_organization_id));

CREATE POLICY "Allow org members to select" ON public.meter_command_batches FOR SELECT TO authenticated USING ((( SELECT public.rls_get_member_org_id() AS rls_get_member_org_id) = rls_organization_id));

CREATE POLICY "Allow org members to select" ON public.energy_cabins FOR SELECT TO authenticated USING ((( SELECT public.rls_get_member_org_id() AS rls_get_member_org_id) = rls_organization_id));

CREATE POLICY "Allow org members to select" ON public.grids FOR SELECT TO authenticated USING ((( SELECT public.rls_get_member_org_id() AS rls_get_member_org_id) = organization_id));

CREATE POLICY "Allow org members to select" ON public.issues FOR SELECT TO authenticated USING ((( SELECT public.rls_get_member_org_id() AS rls_get_member_org_id) = rls_organization_id));

CREATE POLICY "Allow org members to select" ON public.members FOR SELECT TO authenticated USING ((( SELECT public.rls_get_member_org_id() AS rls_get_member_org_id) = rls_organization_id));

CREATE POLICY "Allow org members to select" ON public.meter_commissionings FOR SELECT TO authenticated USING ((( SELECT public.rls_get_member_org_id() AS rls_get_member_org_id) = rls_organization_id));

CREATE POLICY "Allow org members to select" ON public.meter_interactions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow org members to select" ON public.metering_hardware_install_sessions FOR SELECT TO authenticated USING ((( SELECT public.rls_get_member_org_id() AS rls_get_member_org_id) = rls_organization_id));

CREATE POLICY "Allow org members to select" ON public.mppts FOR SELECT TO authenticated USING ((( SELECT public.rls_get_member_org_id() AS rls_get_member_org_id) = rls_organization_id));

CREATE POLICY "Allow org members to select" ON public.notes FOR SELECT TO authenticated USING ((( SELECT public.rls_get_member_org_id() AS rls_get_member_org_id) = rls_organization_id));

CREATE POLICY "Allow org members to select" ON public.orders FOR SELECT TO authenticated USING ((( SELECT public.rls_get_member_org_id() AS rls_get_member_org_id) = rls_organization_id));

CREATE POLICY "Allow org members to select" ON public.organizations FOR SELECT TO authenticated USING ((( SELECT public.rls_get_member_org_id() AS rls_get_member_org_id) = id));

CREATE POLICY "Allow org members to select" ON public.poles FOR SELECT TO authenticated USING ((( SELECT public.rls_get_member_org_id() AS rls_get_member_org_id) = rls_organization_id));

CREATE POLICY "Allow org members to select" ON public.routers FOR SELECT TO authenticated USING ((( SELECT public.rls_get_member_org_id() AS rls_get_member_org_id) = rls_organization_id));

CREATE POLICY "Allow org members to select" ON public.transactions FOR SELECT TO authenticated USING ((( SELECT public.rls_get_member_org_id() AS rls_get_member_org_id) = rls_organization_id));

CREATE POLICY "Allow org members to select (TEMPORARILY OPEN)" ON public.wallets FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow org members to select own and UNASSIGNED" ON public.meters FOR SELECT TO authenticated USING (((rls_organization_id IS NULL) OR (( SELECT public.rls_get_member_org_id() AS rls_get_member_org_id) = rls_organization_id)));

CREATE POLICY "Allow org members to update" ON public.accounts FOR UPDATE TO authenticated USING (( SELECT (public.rls_get_member_org_id() = organization_id) AS rls_get_member_org_id));

CREATE POLICY "Allow org members to update" ON public.orders FOR UPDATE TO authenticated USING (( SELECT (public.rls_get_member_org_id() = rls_organization_id) AS rls_get_member_org_id));

CREATE POLICY "Allow public selects (temporary for sending response to MAKE)" ON public.pd_site_submissions FOR SELECT USING (true);

CREATE POLICY "Allow public writes (Sites can be submitted publicly)" ON public.pd_site_submissions FOR INSERT WITH CHECK (true);
