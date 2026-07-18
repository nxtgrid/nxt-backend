ALTER TABLE ONLY public.meters
    ADD CONSTRAINT "FK_04e1a755d5b760f681e5205557d" FOREIGN KEY (dcu_id) REFERENCES public.dcus(id);

ALTER TABLE ONLY public.mppts
    ADD CONSTRAINT "FK_0a681c1d6d0a67331bbc6956427" FOREIGN KEY (grid_id) REFERENCES public.grids(id);

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "FK_0b03d1bc1cff784570333129e63" FOREIGN KEY (historical_grid_id) REFERENCES public.grids(id);

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT "FK_0b171330be0cb621f8d73b87a9e" FOREIGN KEY (wallet_id) REFERENCES public.wallets(id);

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT "FK_13bf998d703e7d4c7b9a90f4f76" FOREIGN KEY (supabase_id) REFERENCES auth.users(id);

ALTER TABLE ONLY public.audits
    ADD CONSTRAINT "FK_18c521072a6ca9d57365ffb24fe" FOREIGN KEY (agent_id) REFERENCES public.agents(id);

ALTER TABLE ONLY public.audits
    ADD CONSTRAINT "FK_236a383b1007cf64f0c8c7f6534" FOREIGN KEY (customer_id) REFERENCES public.customers(id);

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT "FK_238d61e0f8ac37278f726efac20" FOREIGN KEY (organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.dcus
    ADD CONSTRAINT "FK_254c3db39098da62eb3f96f0006" FOREIGN KEY (grid_id) REFERENCES public.grids(id);

ALTER TABLE ONLY public.poles
    ADD CONSTRAINT "FK_2c21d74185234b0dd39588a4d36" FOREIGN KEY (grid_id) REFERENCES public.grids(id);

ALTER TABLE ONLY public.audits
    ADD CONSTRAINT "FK_2d52a7fc85cfbb0421af977766e" FOREIGN KEY (grid_id) REFERENCES public.grids(id);

ALTER TABLE ONLY public.audits
    ADD CONSTRAINT "FK_2fc5f64b328675b5203d54c7929" FOREIGN KEY (connection_id) REFERENCES public.connections(id);

ALTER TABLE ONLY public.audits
    ADD CONSTRAINT "FK_336b627b254b70b0702436e6aff" FOREIGN KEY (author_id) REFERENCES public.accounts(id);

ALTER TABLE ONLY public.metering_hardware_install_sessions
    ADD CONSTRAINT "FK_35239534a89f0d6dab2612645eb" FOREIGN KEY (author_id) REFERENCES public.accounts(id);

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT "FK_35b89a50cb9203dccff44136519" FOREIGN KEY (author_id) REFERENCES public.accounts(id);

ALTER TABLE ONLY public.connections
    ADD CONSTRAINT "FK_37f79eb1e29a53cc582fbb805e0" FOREIGN KEY (customer_id) REFERENCES public.customers(id);

ALTER TABLE ONLY public.ussd_sessions
    ADD CONSTRAINT "FK_3a2606011b8d9f1de07de2bf0a8" FOREIGN KEY (meter_id) REFERENCES public.meters(id);

ALTER TABLE ONLY public.routers
    ADD CONSTRAINT "FK_3c3ddc58369a9a8147776e39f40" FOREIGN KEY (grid_id) REFERENCES public.grids(id);

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT "FK_3cb0558ed36997f1d9ecc1118e7" FOREIGN KEY (order_id) REFERENCES public.orders(id);

ALTER TABLE ONLY public.metering_hardware_install_sessions
    ADD CONSTRAINT "FK_3f770c153b3333ad1d29cfbf784" FOREIGN KEY (meter_id) REFERENCES public.meters(id);

ALTER TABLE ONLY public.grids
    ADD CONSTRAINT "FK_433ef6a589cd535dff42b34612e" FOREIGN KEY (organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.audits
    ADD CONSTRAINT "FK_4a300197465db92edfc5563d20b" FOREIGN KEY (meter_id) REFERENCES public.meters(id);

ALTER TABLE ONLY public.ussd_sessions
    ADD CONSTRAINT "FK_4cad92626a62976ac0b49244d2e" FOREIGN KEY (bank_id) REFERENCES public.banks(id);

ALTER TABLE ONLY public.metering_hardware_install_sessions
    ADD CONSTRAINT "FK_4eb64f5decb7250cfa993410c1e" FOREIGN KEY (last_meter_commissioning_id) REFERENCES public.meter_commissionings(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT "FK_51a88ee1d4fceb047e7cfda3baa" FOREIGN KEY (grid_id) REFERENCES public.grids(id);

ALTER TABLE ONLY public.meters
    ADD CONSTRAINT "FK_5606d6ec5ab568377509edc5267" FOREIGN KEY (last_encountered_issue_id) REFERENCES public.issues(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "FK_576b0e9af0bec469bff33b965aa" FOREIGN KEY (receiver_wallet_id) REFERENCES public.wallets(id);

ALTER TABLE ONLY public.metering_hardware_imports
    ADD CONSTRAINT "FK_5c2bb31b2e45c3f1da0b72071a2" FOREIGN KEY (metering_hardware_install_session_id) REFERENCES public.metering_hardware_install_sessions(id);

ALTER TABLE ONLY public.meter_command_batches
    ADD CONSTRAINT "FK_5c44fae05dc443720f62664e563" FOREIGN KEY (grid_id) REFERENCES public.grids(id);

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT "FK_5ec9536f852f1923097ba1ecdac" FOREIGN KEY (meter_id) REFERENCES public.meters(id);

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "FK_60816230893327daacc86ab41c8" FOREIGN KEY (author_id) REFERENCES public.accounts(id);

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT "FK_6580899a2293de27787376887fa" FOREIGN KEY (customer_id) REFERENCES public.customers(id);

ALTER TABLE ONLY public.meter_commissionings
    ADD CONSTRAINT "FK_6684f0790c54ed3d441f78df91a" FOREIGN KEY (metering_hardware_install_session_id) REFERENCES public.metering_hardware_install_sessions(id);

ALTER TABLE ONLY public.meter_command_batches
    ADD CONSTRAINT "FK_6e26cb6e966f484f0f897127c84" FOREIGN KEY (author_id) REFERENCES public.accounts(id);

ALTER TABLE ONLY public.meter_command_batch_executions
    ADD CONSTRAINT "FK_7b0737005e7c358392d87ebb329" FOREIGN KEY (meter_command_batch_id) REFERENCES public.meter_command_batches(id);

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT "FK_7b15f3fbbedf51a1a3d21583b7e" FOREIGN KEY (meter_id) REFERENCES public.meters(id);

ALTER TABLE ONLY public.meters
    ADD CONSTRAINT "FK_86d4557a79e374b5c55cb3b66d8" FOREIGN KEY (last_metering_hardware_install_session_id) REFERENCES public.metering_hardware_install_sessions(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT "FK_8db1f4e4f8122bd25d50ad96b26" FOREIGN KEY (meter_id) REFERENCES public.meters(id);

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "FK_8f12fe9c7b078122adcae80375d" FOREIGN KEY (sender_wallet_id) REFERENCES public.wallets(id);

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "FK_92081072063eaf51300ab6c267d" FOREIGN KEY (ussd_session_id) REFERENCES public.ussd_sessions(id);

ALTER TABLE ONLY public.dcus
    ADD CONSTRAINT "FK_9334b587e6e5291f8ccd1b11c44" FOREIGN KEY (last_metering_hardware_install_session_id) REFERENCES public.metering_hardware_install_sessions(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "FK_982f77636cb1da8e76745949530" FOREIGN KEY (notification_parameter_id) REFERENCES public.notification_parameters(id);

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT "FK_9bb7cb7efc780ec4d3dec34354f" FOREIGN KEY (grid_id) REFERENCES public.grids(id);

ALTER TABLE ONLY public.meters
    ADD CONSTRAINT "FK_a11871575f7ddb95e567d842bc6" FOREIGN KEY (pole_id) REFERENCES public.poles(id);

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "FK_a1ec3b4b4f2017665b534e60256" FOREIGN KEY (account_id) REFERENCES public.accounts(id);

ALTER TABLE ONLY public.members
    ADD CONSTRAINT "FK_a9da2a35fdd2cd46a7bfc57fd73" FOREIGN KEY (busy_commissioning_id) REFERENCES public.grids(id);

ALTER TABLE ONLY public.audits
    ADD CONSTRAINT "FK_abde505f056e2f46c5df2c12491" FOREIGN KEY (organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.energy_cabins
    ADD CONSTRAINT "FK_ba81ffc1506025a549849f06f36" FOREIGN KEY (grid_id) REFERENCES public.grids(id);

ALTER TABLE ONLY public.metering_hardware_install_sessions
    ADD CONSTRAINT "FK_be64a09dc738420a409cb960264" FOREIGN KEY (last_metering_hardware_import_id) REFERENCES public.metering_hardware_imports(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.ussd_session_hops
    ADD CONSTRAINT "FK_bf89299bd6534528adad645b7a5" FOREIGN KEY (ussd_session_id) REFERENCES public.ussd_sessions(id);

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "FK_c1053eec8005016c7d9febdc484" FOREIGN KEY (grid_id) REFERENCES public.grids(id);

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "FK_cb7b1fb018b296f2107e998b2ff" FOREIGN KEY (organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.meters
    ADD CONSTRAINT "FK_d281c6e5f391b8de5b221032da6" FOREIGN KEY (connection_id) REFERENCES public.connections(id);

ALTER TABLE ONLY public.connection_requested_meters
    ADD CONSTRAINT "FK_d390197863e9a88be5e122d9695" FOREIGN KEY (connection_id) REFERENCES public.connections(id);

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT "FK_decaf331589778e33441b2a8d9e" FOREIGN KEY (account_id) REFERENCES public.accounts(id);

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT "FK_df520decc9e003a843d8edd9867" FOREIGN KEY (account_id) REFERENCES public.accounts(id);

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT "FK_e04c36c14bc9f01f84cd7655b68" FOREIGN KEY (customer_id) REFERENCES public.customers(id);

ALTER TABLE ONLY public.audits
    ADD CONSTRAINT "FK_e3f3409859562fbe10b78d1399e" FOREIGN KEY (member_id) REFERENCES public.members(id);

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT "FK_e63e504d8e35ef37a2c56b75eb9" FOREIGN KEY (connection_id) REFERENCES public.connections(id);

ALTER TABLE ONLY public.audits
    ADD CONSTRAINT "FK_eb582acfd9d83af268d328e0b79" FOREIGN KEY (dcu_id) REFERENCES public.dcus(id);

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT "FK_ebcc29963874e55053e8ee80be5" FOREIGN KEY (account_id) REFERENCES public.accounts(id);

ALTER TABLE ONLY public.ussd_sessions
    ADD CONSTRAINT "FK_ede50d58fa445bfa012135249fd" FOREIGN KEY (account_id) REFERENCES public.accounts(id);

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT "FK_f1a5ea7b77453030e2a1df27479" FOREIGN KEY (connection_id) REFERENCES public.connections(id);

ALTER TABLE ONLY public.metering_hardware_install_sessions
    ADD CONSTRAINT "FK_f3c53f4b922a011aa53d9e0b1ad" FOREIGN KEY (dcu_id) REFERENCES public.dcus(id);

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT "FK_f499c61c6d6a0ac3f794d966edc" FOREIGN KEY (organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT "FK_f5782e05e8688f0cfbb5c4a52ce" FOREIGN KEY (agent_id) REFERENCES public.agents(id);

ALTER TABLE ONLY public.members
    ADD CONSTRAINT "FK_fd9dfb97e21b75fc45d42aa614a" FOREIGN KEY (account_id) REFERENCES public.accounts(id);

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_rls_organization_id_fkey FOREIGN KEY (rls_organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.connection_requested_meters
    ADD CONSTRAINT connection_requested_meters_rls_organization_id_fkey FOREIGN KEY (rls_organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.connections
    ADD CONSTRAINT connections_rls_organization_id_fkey FOREIGN KEY (rls_organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_rls_organization_id_fkey FOREIGN KEY (rls_organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.dcus
    ADD CONSTRAINT dcus_rls_organization_id_fkey FOREIGN KEY (rls_organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.meter_command_batch_executions
    ADD CONSTRAINT meter_command_batch_executions_rls_organization_id_fkey FOREIGN KEY (rls_organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.meter_command_batches
    ADD CONSTRAINT meter_command_batches_rls_organization_id_fkey FOREIGN KEY (rls_organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.energy_cabins
    ADD CONSTRAINT energy_cabins_rls_organization_id_fkey FOREIGN KEY (rls_organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT issues_rls_organization_id_fkey FOREIGN KEY (rls_organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_rls_organization_id_fkey FOREIGN KEY (rls_organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.meter_commissionings
    ADD CONSTRAINT meter_commissionings_rls_organization_id_fkey FOREIGN KEY (rls_organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.meter_interactions
    ADD CONSTRAINT meter_interactions_batch_execution_id_fkey FOREIGN KEY (batch_execution_id) REFERENCES public.meter_command_batch_executions(id);

ALTER TABLE ONLY public.meter_interactions
    ADD CONSTRAINT meter_interactions_meter_commissioning_id_fkey FOREIGN KEY (meter_commissioning_id) REFERENCES public.meter_commissionings(id);

ALTER TABLE ONLY public.meter_interactions
    ADD CONSTRAINT meter_interactions_meter_id_fkey FOREIGN KEY (meter_id) REFERENCES public.meters(id);

ALTER TABLE ONLY public.meter_interactions
    ADD CONSTRAINT meter_interactions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);

ALTER TABLE ONLY public.metering_hardware_imports
    ADD CONSTRAINT metering_hardware_imports_rls_organization_id_fkey FOREIGN KEY (rls_organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.metering_hardware_install_sessions
    ADD CONSTRAINT metering_hardware_install_sessions_rls_organization_id_fkey FOREIGN KEY (rls_organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.meters
    ADD CONSTRAINT meters_rls_grid_id_fkey FOREIGN KEY (rls_grid_id) REFERENCES public.grids(id);

ALTER TABLE ONLY public.meters
    ADD CONSTRAINT meters_rls_organization_id_fkey FOREIGN KEY (rls_organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.mppts
    ADD CONSTRAINT mppts_rls_organization_id_fkey FOREIGN KEY (rls_organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_rls_organization_id_fkey FOREIGN KEY (rls_organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_rls_organization_id_fkey FOREIGN KEY (rls_organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.pd_site_submissions
    ADD CONSTRAINT pd_site_submissions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.pd_sites
    ADD CONSTRAINT pd_sites_operations_grid_id_fkey FOREIGN KEY (operations_grid_id) REFERENCES public.grids(id);

ALTER TABLE ONLY public.pd_sites
    ADD CONSTRAINT pd_sites_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.poles
    ADD CONSTRAINT poles_rls_organization_id_fkey FOREIGN KEY (rls_organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.routers
    ADD CONSTRAINT routers_rls_organization_id_fkey FOREIGN KEY (rls_organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_rls_organization_id_fkey FOREIGN KEY (rls_organization_id) REFERENCES public.organizations(id);

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_rls_organization_id_fkey FOREIGN KEY (rls_organization_id) REFERENCES public.organizations(id);
