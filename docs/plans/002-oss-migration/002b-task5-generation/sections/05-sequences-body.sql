CREATE SEQUENCE public.accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.accounts ALTER COLUMN id SET DEFAULT nextval('public.accounts_id_seq'::regclass);

ALTER SEQUENCE public.accounts_id_seq OWNED BY public.accounts.id;

CREATE SEQUENCE public.agents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.agents ALTER COLUMN id SET DEFAULT nextval('public.agents_id_seq'::regclass);

ALTER SEQUENCE public.agents_id_seq OWNED BY public.agents.id;

CREATE SEQUENCE public.api_keys_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.api_keys ALTER COLUMN id SET DEFAULT nextval('public.api_keys_id_seq'::regclass);

ALTER SEQUENCE public.api_keys_id_seq OWNED BY public.api_keys.id;

CREATE SEQUENCE public.audits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.audits ALTER COLUMN id SET DEFAULT nextval('public.audits_id_seq'::regclass);

ALTER SEQUENCE public.audits_id_seq OWNED BY public.audits.id;

CREATE SEQUENCE public.banks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.banks ALTER COLUMN id SET DEFAULT nextval('public.banks_id_seq'::regclass);

ALTER SEQUENCE public.banks_id_seq OWNED BY public.banks.id;

CREATE SEQUENCE public.dcus_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.dcus ALTER COLUMN id SET DEFAULT nextval('public.dcus_id_seq'::regclass);

ALTER SEQUENCE public.dcus_id_seq OWNED BY public.dcus.id;

CREATE SEQUENCE public.meters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.meters ALTER COLUMN id SET DEFAULT nextval('public.meters_id_seq'::regclass);

ALTER SEQUENCE public.meters_id_seq OWNED BY public.meters.id;

CREATE SEQUENCE public.poles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.poles ALTER COLUMN id SET DEFAULT nextval('public.poles_id_seq'::regclass);

ALTER SEQUENCE public.poles_id_seq OWNED BY public.poles.id;

CREATE SEQUENCE public.connection_requested_meters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.connection_requested_meters ALTER COLUMN id SET DEFAULT nextval('public.connection_requested_meters_id_seq'::regclass);

ALTER SEQUENCE public.connection_requested_meters_id_seq OWNED BY public.connection_requested_meters.id;

CREATE SEQUENCE public.connections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.connections ALTER COLUMN id SET DEFAULT nextval('public.connections_id_seq'::regclass);

ALTER SEQUENCE public.connections_id_seq OWNED BY public.connections.id;

CREATE SEQUENCE public.customers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.customers ALTER COLUMN id SET DEFAULT nextval('public.customers_id_seq'::regclass);

ALTER SEQUENCE public.customers_id_seq OWNED BY public.customers.id;

CREATE SEQUENCE public.meter_command_batch_executions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.meter_command_batch_executions ALTER COLUMN id SET DEFAULT nextval('public.meter_command_batch_executions_id_seq'::regclass);

ALTER SEQUENCE public.meter_command_batch_executions_id_seq OWNED BY public.meter_command_batch_executions.id;

CREATE SEQUENCE public.meter_command_batches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.meter_command_batches ALTER COLUMN id SET DEFAULT nextval('public.meter_command_batches_id_seq'::regclass);

ALTER SEQUENCE public.meter_command_batches_id_seq OWNED BY public.meter_command_batches.id;

CREATE SEQUENCE public.energy_cabins_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.energy_cabins ALTER COLUMN id SET DEFAULT nextval('public.energy_cabins_id_seq'::regclass);

ALTER SEQUENCE public.energy_cabins_id_seq OWNED BY public.energy_cabins.id;

CREATE SEQUENCE public.grids_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.grids ALTER COLUMN id SET DEFAULT nextval('public.grids_id_seq'::regclass);

ALTER SEQUENCE public.grids_id_seq OWNED BY public.grids.id;

CREATE SEQUENCE public.issues_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.issues ALTER COLUMN id SET DEFAULT nextval('public.issues_id_seq'::regclass);

ALTER SEQUENCE public.issues_id_seq OWNED BY public.issues.id;

CREATE SEQUENCE public.members_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.members ALTER COLUMN id SET DEFAULT nextval('public.members_id_seq'::regclass);

ALTER SEQUENCE public.members_id_seq OWNED BY public.members.id;

CREATE SEQUENCE public.meter_commissionings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.meter_commissionings ALTER COLUMN id SET DEFAULT nextval('public.meter_commissionings_id_seq'::regclass);

ALTER SEQUENCE public.meter_commissionings_id_seq OWNED BY public.meter_commissionings.id;

ALTER TABLE public.meter_interactions ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.meter_interactions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE SEQUENCE public.metering_hardware_imports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.metering_hardware_imports ALTER COLUMN id SET DEFAULT nextval('public.metering_hardware_imports_id_seq'::regclass);

ALTER SEQUENCE public.metering_hardware_imports_id_seq OWNED BY public.metering_hardware_imports.id;

CREATE SEQUENCE public.metering_hardware_install_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.metering_hardware_install_sessions ALTER COLUMN id SET DEFAULT nextval('public.metering_hardware_install_sessions_id_seq'::regclass);

ALTER SEQUENCE public.metering_hardware_install_sessions_id_seq OWNED BY public.metering_hardware_install_sessions.id;

CREATE SEQUENCE public.mppts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.mppts ALTER COLUMN id SET DEFAULT nextval('public.mppts_id_seq'::regclass);

ALTER SEQUENCE public.mppts_id_seq OWNED BY public.mppts.id;

CREATE SEQUENCE public.notes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.notes ALTER COLUMN id SET DEFAULT nextval('public.notes_id_seq'::regclass);

ALTER SEQUENCE public.notes_id_seq OWNED BY public.notes.id;

CREATE SEQUENCE public.notification_parameters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.notification_parameters ALTER COLUMN id SET DEFAULT nextval('public.notification_parameters_id_seq'::regclass);

ALTER SEQUENCE public.notification_parameters_id_seq OWNED BY public.notification_parameters.id;

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;

CREATE SEQUENCE public.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;

CREATE SEQUENCE public.organizations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.organizations ALTER COLUMN id SET DEFAULT nextval('public.organizations_id_seq'::regclass);

ALTER SEQUENCE public.organizations_id_seq OWNED BY public.organizations.id;

ALTER TABLE public.pd_site_submissions ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.pd_site_submissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

ALTER TABLE public.pd_sites ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.pd_sites_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE SEQUENCE public.routers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.routers ALTER COLUMN id SET DEFAULT nextval('public.routers_id_seq'::regclass);

ALTER SEQUENCE public.routers_id_seq OWNED BY public.routers.id;

CREATE SEQUENCE public.solcast_cache_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.solcast_cache ALTER COLUMN id SET DEFAULT nextval('public.solcast_cache_id_seq'::regclass);

ALTER SEQUENCE public.solcast_cache_id_seq OWNED BY public.solcast_cache.id;

CREATE SEQUENCE public.transactions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.transactions ALTER COLUMN id SET DEFAULT nextval('public.transactions_id_seq'::regclass);

ALTER SEQUENCE public.transactions_id_seq OWNED BY public.transactions.id;

CREATE SEQUENCE public.ussd_session_hops_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.ussd_session_hops ALTER COLUMN id SET DEFAULT nextval('public.ussd_session_hops_id_seq'::regclass);

ALTER SEQUENCE public.ussd_session_hops_id_seq OWNED BY public.ussd_session_hops.id;

CREATE SEQUENCE public.ussd_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.ussd_sessions ALTER COLUMN id SET DEFAULT nextval('public.ussd_sessions_id_seq'::regclass);

ALTER SEQUENCE public.ussd_sessions_id_seq OWNED BY public.ussd_sessions.id;

CREATE SEQUENCE public.wallets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.wallets ALTER COLUMN id SET DEFAULT nextval('public.wallets_id_seq'::regclass);

ALTER SEQUENCE public.wallets_id_seq OWNED BY public.wallets.id;
