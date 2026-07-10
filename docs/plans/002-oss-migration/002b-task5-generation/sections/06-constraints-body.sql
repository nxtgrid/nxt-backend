ALTER TABLE ONLY public.connections
    ADD CONSTRAINT "PK_0a1f844af3122354cbd487a8d03" PRIMARY KEY (id);

ALTER TABLE ONLY public.meters
    ADD CONSTRAINT "PK_0a71b52dbb545fa36efaf070583" PRIMARY KEY (id);

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT "PK_133ec679a801fab5e070f73d3ea" PRIMARY KEY (id);

ALTER TABLE ONLY public.poles
    ADD CONSTRAINT "PK_1f4336016e8de1d62acb05ce829" PRIMARY KEY (id);

ALTER TABLE ONLY public.members
    ADD CONSTRAINT "PK_28b53062261b996d9c99fa12404" PRIMARY KEY (id);

ALTER TABLE ONLY public.notification_parameters
    ADD CONSTRAINT "PK_338f36e72b69406bed36e054e09" PRIMARY KEY (id);

ALTER TABLE ONLY public.banks
    ADD CONSTRAINT "PK_3975b5f684ec241e3901db62d77" PRIMARY KEY (id);

ALTER TABLE ONLY public.metering_hardware_install_sessions
    ADD CONSTRAINT "PK_4eb998262e5c773a89dfe3ea0e1" PRIMARY KEY (id);

ALTER TABLE ONLY public.ussd_session_hops
    ADD CONSTRAINT "PK_56d984bae21ce6e86848a8a3c04" PRIMARY KEY (id);

ALTER TABLE ONLY public.energy_cabins
    ADD CONSTRAINT "PK_59ecb7965974e45fdc2f243bda7" PRIMARY KEY (id);

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT "PK_5a7a02c20412299d198e097a8fe" PRIMARY KEY (id);

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT "PK_5c8a79801b44bd27b79228e1dad" PRIMARY KEY (id);

ALTER TABLE ONLY public.metering_hardware_imports
    ADD CONSTRAINT "PK_665b32b395a7675648ed77da4f6" PRIMARY KEY (id);

ALTER TABLE ONLY public.meter_commissionings
    ADD CONSTRAINT "PK_69fce91302a5dc8dd3db274717b" PRIMARY KEY (id);

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY (id);

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT "PK_6b031fcd0863e3f6b44230163f9" PRIMARY KEY (id);

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY (id);

ALTER TABLE ONLY public.dcus
    ADD CONSTRAINT "PK_82192607fa5119101a78fe53b7d" PRIMARY KEY (id);

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT "PK_8402e5df5a30a229380e83e4f7e" PRIMARY KEY (id);

ALTER TABLE ONLY public.grids
    ADD CONSTRAINT "PK_840d40fdcde1e935afd43082aca" PRIMARY KEY (id);

ALTER TABLE ONLY public.meter_command_batches
    ADD CONSTRAINT "PK_92d424811a3fd49a8020eadb97a" PRIMARY KEY (id);

ALTER TABLE ONLY public.meter_command_batch_executions
    ADD CONSTRAINT "PK_9494ab23abdfe4e59f3f29842d5" PRIMARY KEY (id);

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT "PK_9c653f28ae19c5884d5baf6a1d9" PRIMARY KEY (id);

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT "PK_9d8ecbbeff46229c700f0449257" PRIMARY KEY (id);

ALTER TABLE ONLY public.solcast_cache
    ADD CONSTRAINT "PK_a0b1d6bdbc5ca0056201a1c6dd0" PRIMARY KEY (id);

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT "PK_a219afd8dd77ed80f5a862f1db9" PRIMARY KEY (id);

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT "PK_af6206538ea96c4e77e9f400c3d" PRIMARY KEY (id);

ALTER TABLE ONLY public.audits
    ADD CONSTRAINT "PK_b2d7a2089999197dc7024820f28" PRIMARY KEY (id);

ALTER TABLE ONLY public.routers
    ADD CONSTRAINT "PK_b6d283f1e40d4942dedbc0cb27a" PRIMARY KEY (id);

ALTER TABLE ONLY public.ussd_sessions
    ADD CONSTRAINT "PK_c18f16f36e79b2fb87783476830" PRIMARY KEY (id);

ALTER TABLE ONLY public.mppts
    ADD CONSTRAINT "PK_c8a4dc57b932c173f6c579804c0" PRIMARY KEY (id);

ALTER TABLE ONLY public.connection_requested_meters
    ADD CONSTRAINT "PK_ef90f8d1aa3055757e0ff8e4aa7" PRIMARY KEY (id);

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT "REL_13bf998d703e7d4c7b9a90f4f7" UNIQUE (supabase_id);

ALTER TABLE ONLY public.metering_hardware_install_sessions
    ADD CONSTRAINT "REL_4eb64f5decb7250cfa993410c1" UNIQUE (last_meter_commissioning_id);

ALTER TABLE ONLY public.meters
    ADD CONSTRAINT "REL_5606d6ec5ab568377509edc526" UNIQUE (last_encountered_issue_id);

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT "REL_6580899a2293de27787376887f" UNIQUE (customer_id);

ALTER TABLE ONLY public.meters
    ADD CONSTRAINT "REL_86d4557a79e374b5c55cb3b66d" UNIQUE (last_metering_hardware_install_session_id);

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT "REL_8db1f4e4f8122bd25d50ad96b2" UNIQUE (meter_id);

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "REL_92081072063eaf51300ab6c267" UNIQUE (ussd_session_id);

ALTER TABLE ONLY public.dcus
    ADD CONSTRAINT "REL_9334b587e6e5291f8ccd1b11c4" UNIQUE (last_metering_hardware_install_session_id);

ALTER TABLE ONLY public.metering_hardware_install_sessions
    ADD CONSTRAINT "REL_be64a09dc738420a409cb96026" UNIQUE (last_metering_hardware_import_id);

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT "REL_df520decc9e003a843d8edd986" UNIQUE (account_id);

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT "REL_e63e504d8e35ef37a2c56b75eb" UNIQUE (connection_id);

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT "REL_ebcc29963874e55053e8ee80be" UNIQUE (account_id);

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT "REL_f499c61c6d6a0ac3f794d966ed" UNIQUE (organization_id);

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT "REL_f5782e05e8688f0cfbb5c4a52c" UNIQUE (agent_id);

ALTER TABLE ONLY public.members
    ADD CONSTRAINT "REL_fd9dfb97e21b75fc45d42aa614" UNIQUE (account_id);

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT "UQ_0ec8c228e89a95aeb4af9ee3226" UNIQUE (telegram_link_token);

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT "UQ_3ffa9ce30e56b6d2abf0a465f5f" UNIQUE (telegram_id);

ALTER TABLE ONLY public.grids
    ADD CONSTRAINT "UQ_61f08f04c9f0f1d3afd24b9be0b" UNIQUE (identifier);

ALTER TABLE ONLY public.poles
    ADD CONSTRAINT "UQ_67112e4334d7090a571d2fff42a" UNIQUE (external_reference);

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT "UQ_e42cf55faeafdcce01a82d24849" UNIQUE (key);

ALTER TABLE ONLY public.meter_interactions
    ADD CONSTRAINT meter_interactions_order_id_key UNIQUE (order_id);

ALTER TABLE ONLY public.meter_interactions
    ADD CONSTRAINT meter_interactions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.pd_site_submissions
    ADD CONSTRAINT pd_public_submissions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.pd_sites
    ADD CONSTRAINT pd_sites_pkey PRIMARY KEY (id);
