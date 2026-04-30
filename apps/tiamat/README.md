# tiamat

The primary REST + WebSocket API for the Skyfox platform. All frontend dashboards and integrations talk to Tiamat for operational data, payments, meter management, and user/organization administration.

**Default port:** set via `NXT_PORT`

---

## Responsibilities

- Remote meter interactions and device message pipeline
- Payment orders, wallets, and payouts
- User and organization management
- Real-time updates to connected frontends via Socket.IO
- LoRaWAN webhook bridge to the device messaging pipeline
- Integration touchpoints for Jira, Flutterwave, SendGrid, Telegram, Africa's Talking, ChirpStack

---

## Modules

| Module | Description |
|--------|-------------|
| `accounts` | Customer/account domain — loads accounts with full relations (agent, grid, org, wallet, member). |
| `africastalking` | Africa's Talking SMS integration. |
| `agents` | Field staff (agent) management API. |
| `api-keys` | API key issuance and validation for machine-to-machine integrations. |
| `auth` | Supabase-based authentication guard; Grafana token endpoint. |
| `autopilot` | Automation logic for triggering grid actions based on configurable conditions. |
| `chirpstack` | Receives LoRaWAN webhooks from ChirpStack and routes them into the device messaging pipeline. |
| `connections` | Grid connection records (customers connected to a grid). |
| `data-analytics` | Reporting and analytics endpoints for grid performance data. |
| `dcus` | Distribution control units — inventory, grid assignment, bulk state updates. |
| `device-messages` | Core meter/device message pipeline: handles incoming pushes (webhooks) and outgoing pull commands, with queue-based delivery and retry logic. |
| `directive-batches` | Groups of remote commands to be sent to hardware. |
| `directive-batch-executions` | Execution tracking for directive batches. |
| `download` | Prepares and streams file downloads for grid and asset data. |
| `epicollect` | Receives and processes inbound EpiCollect mobile survey data. |
| `flutterwave` | Flutterwave payment gateway hooks and helpers. |
| `grids` | Mini-grid records, diagnostics sync, connectivity stats, and data exports. |
| `issues` | Operational issue and ticket management. |
| `jira` | Jira / Atlassian Service Desk integration for issue escalation. |
| `lost-revenue` | Tracks and reports on revenue lost due to grid/meter downtime. |
| `meter-installs` | Meter installation and uninstallation workflows. |
| `meter-interactions` | Remote commands to meters — create, retry, reconcile, and poll delivery status. |
| `metering-hardware-install-sessions` | Session records for hardware installation operations. |
| `meters` | Meter inventory, grid assignment, token generation and delivery, CALIN-facing helpers. |
| `mppts` | MPPT/solar charge controller data and API. |
| `notifications` | User and operator notification management. |
| `orders` | Customer wallet top-up orders and Flutterwave payment flow. |
| `organizations` | Organization records and wallet loading. |
| `payouts` | Payout generation and external system metadata updates. |
| `pd-actions` | Individual product/directive action execution. |
| `pd-flows` | Sequences of PD actions. |
| `sendgrid` | Transactional email via SendGrid. |
| `telegram` | Telegram bot notifications. |
| `user-admin` | Admin operations on users, customers, and field agents. |
| `ussd-sessions` | USSD session and hop handling for feature-phone interactions. |
| `wallets` | Wallet balance management and money movement. |
| `websocket` | Socket.IO gateway — clients join grid-specific rooms and receive real-time meter interaction events. |

> **Note:** The folders `一demo`, `一directive-watchdog-sessions`, and `一meter-credit-transfers` are disabled/WIP and not registered in `AppModule`.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in all values before running.

| Variable | Description |
|----------|-------------|
| `IS_HIBERNATED` | Set to `true` to start the app with no modules loaded (idle/standby mode). |
| `NXT_PORT` | HTTP listen port. |
| `NXT_ENV` | Environment name (e.g. `development`, `production`). |
| `NXT_JWT_DURATION` | JWT / session token lifetime. |
| `NXT_DB_HOST` | Primary PostgreSQL host (TypeORM). |
| `NXT_DB_PORT` | Primary PostgreSQL port. |
| `NXT_DB_USERNAME` | Primary PostgreSQL username. |
| `NXT_DB_PASSWORD` | Primary PostgreSQL password. |
| `NXT_DB_NAME` | Primary PostgreSQL database name. |
| `NXT_TIMESCALE_DB_HOST` | TimescaleDB host. |
| `NXT_TIMESCALE_DB_PORT` | TimescaleDB port. |
| `NXT_TIMESCALE_DB_USERNAME` | TimescaleDB username. |
| `NXT_TIMESCALE_DB_PASSWORD` | TimescaleDB password. |
| `NXT_TIMESCALE_DB_NAME` | TimescaleDB database name. |
| `SUPABASE_API_URL` | Supabase project URL. |
| `SUPABASE_ANON_KEY` | Supabase anonymous (public) key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (admin). |
| `SUPABASE_JWT_SECRET` | Supabase JWT secret for token verification. |
| `FLW_API` | Flutterwave API base URL. |
| `FLW_PUBLIC_KEY` | Flutterwave public key. |
| `FLW_SECRET_KEY` | Flutterwave secret key. |
| `CALIN_V1_*` | CALIN v1 API credentials and endpoint. |
| `CALIN_V2_*` | CALIN v2 API credentials and endpoint. |
| `CALIN_SIMULATOR_API` | CALIN simulator endpoint (for development/testing). |
| `STS_GENERATOR_API` | STS token generation service endpoint. |
| `STS_GENERATOR_API_KEY` | STS token generation API key. |
| `SENDGRID_API_KEY` | SendGrid API key for email. |
| `CHIRPSTACK_API_URL` | ChirpStack network server URL. |
| `CHIRPSTACK_API_TOKEN` | ChirpStack API token. |
| `CHIRPSTACK_APPLICATION_ID` | ChirpStack application ID. |
| `CHIRPSTACK_TENANT_ID` | ChirpStack tenant ID. |
| `CHIRPSTACK_PROFILE_ID` | ChirpStack device profile ID. |
| `CHIRPSTACK_APP_KEY` | ChirpStack application key. |
| `VICTRON_API_URL` | Victron VRM API base URL. |
| `VICTRON_API_TOKEN` | Victron API token. |
| `VICTRON_USERNAME` | Victron account username. |
| `VICTRON_PASSWORD` | Victron account password. |
| `JIRA_API` | Jira REST API base URL. |
| `JIRA_SERVICE_DESK_API` | Jira Service Desk API URL. |
| `JIRA_API_USERNAME` | Jira API username. |
| `JIRA_API_KEY` | Jira API key. |
| `MAKE_API_URL` | Make.com API base URL. |
| `MAKE_API_TOKEN` | Make.com API token. |
| `MAKE_API_PAYOUT_FLOW_DRAFT_ID` | Make.com scenario ID for payout draft automation. |
| `EXCHANGE_RATES_API_URL` | Exchange rates API base URL. |
| `EXCHANGE_RATES_API_KEY` | Exchange rates API key. |
| `FLOW_XO_API` | Flow XO API base URL. |
| `FLOW_XO_TOKEN_RESPONSE_PATH` | Flow XO token response path. |
| `S3_ENDPOINT` | S3-compatible object storage endpoint. |
| `S3_KEY` | S3 access key. |
| `S3_SECRET` | S3 secret key. |
| `S3_BUCKET` | S3 bucket name. |
| `UPLOAD_FOLDER` | Local folder for temporary file uploads. |
| `AUTOPILOT_S3_*` | Separate S3 configuration for the autopilot feature. |
| `TALOS_API` | Internal Talos service base URL. |
| `YETI_API` | Internal Yeti service base URL. |
| `LOCH_API` | Internal Loch service base URL. |
| `HERMES_HOST` | Hermes service host. |
| `HERMES_PORT` | Hermes service port. |
| `HERMES_USERNAME` | Hermes service username. |
| `HERMES_PASSWORD` | Hermes service password. |
| `AYRTON_ACCOUNT_CONFIRM_URL` | Frontend URL for account confirmation emails. |
| `AYRTON_PASSWORD_RESET_URL` | Frontend URL for password reset emails. |
| `SENTRY_DSN` | Sentry DSN for error reporting. |
| `LOKI_URL` | Grafana Loki push URL for structured logging. |
| `LOKI_APP_NAME` | App label used in Loki log streams. |
| `PRIVATE_KEY` | Application private key (must be last in `.env`). |
| `PUBLIC_KEY` | Application public key (must be last in `.env`). |

---

## Running

```bash
# Development
npx nx serve tiamat

# Production build
npx nx build tiamat --configuration=production
```

---

## License

This project is licensed under the [Mozilla Public License 2.0](https://www.mozilla.org/MPL/2.0/). See the [`LICENSE`](../../LICENSE) file at the repository root.
