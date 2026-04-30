# loch

Background jobs, automation, and third-party integrations service. Loch runs scheduled and event-driven processes that keep the platform's data in sync, send notifications, and interface with external services.

**Default port:** set via `NXT_PORT`

---

## Responsibilities

- Scheduled cron jobs for revenue reporting, payouts, lifeline credits, and notifications
- MQTT subscriptions to Victron Energy brokers for live battery/solar state
- Outbound notifications via email, SMS, and Telegram
- EpiCollect field survey data ingestion
- PD Hero document generation via Make.com
- Autopilot scoring and triggering

---

## Modules

| Module | Description |
|--------|-------------|
| `agents` | Registers the `Agent` entity and exports `AgentsService` for use across the app. |
| `africastalking` | Sends SMS notifications via Africa's Talking using configured credentials. |
| `autopilot` | Cron-driven mini-grid autopilot — scores Victron + Timescale data and evaluates action matrices. Exposes `POST /autopilot/test` for manual evaluation. |
| `epicollect` | Imports and syncs EpiCollect contract survey submissions into Supabase. Exposes HTTP routes under `/epicollect`. |
| `lifeline` | Daily job that recalculates lifeline credit eligibility from Timescale consumption data and updates connection records. |
| `make` | Global `MakeService` for triggering Make.com scenarios via the Make API. |
| `mongo-atlas` | Thin HTTP client to the MongoDB Atlas Data API for `insertOne` operations (used by EpiCollect payloads). |
| `mqtt` | Subscribes to Victron MQTT topics for battery state of charge per grid. |
| `notification-parameters` | TypeORM-backed CRUD for per-grid notification configuration. |
| `notifications` | Per-minute cron that locks and dispatches pending notifications via SendGrid, Telegram, and SMS. Exposes `/notifications` HTTP routes. |
| `payouts` | Monthly cron that generates grid payouts via Tiamat, triggers the Xero Make flow, and emails finance with payout links. |
| `pd-hero` | Processes locked `pd_actions` through Make.com document/folder/share flows. Exposes `GET /pd-hero/run`; waits for in-flight tasks before shutdown. |
| `revenue-update` | Weekly revenue reports and commercial issue notifications with links to the frontend dashboard. |
| `sendgrid` | Sends templated transactional emails via the SendGrid API. |
| `sunrise-sunset` | Fetches sunrise/sunset times for a given location and date (calls sunrise-sunset.org with fallback times). Used by other services; no HTTP controller. |
| `telegram` | Delivers Telegram notifications through Make.com or Flow XO webhooks, with rate limiting. |
| `weather` | Every 5 minutes reads weather data from Victron per grid and PATCHes aggregated values to Tiamat. |

> **Note:** The `lost-revenue` module is fully commented out and not registered in `AppModule`. It is parked/inactive code.

---

## HTTP Endpoints

Most modules in Loch are cron/worker-only. The modules that expose HTTP routes are:

| Path | Module |
|------|--------|
| `POST /epicollect/*` | `epicollect` |
| `POST /autopilot/test` | `autopilot` |
| `GET|POST /notifications/*` | `notifications` |
| `GET /pd-hero/run` | `pd-hero` |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in all values before running.

| Variable | Description |
|----------|-------------|
| `IS_HIBERNATED` | Set to `true` to start with no modules loaded (idle/standby mode). |
| `NXT_PORT` | HTTP listen port. |
| `NXT_ENV` | Environment name. Most cron jobs are disabled unless set to `production`. |
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
| `TIAMAT_API` | Tiamat service base URL. |
| `TIAMAT_API_KEY` | Tiamat API key (`X-API-KEY` header). |
| `EPICOLLECT_API` | EpiCollect API base URL. |
| `VICTRON_API_URL` | Victron VRM API base URL. |
| `VICTRON_API_TOKEN` | Victron API token. |
| `VICTRON_USERNAME` | Victron account username (used for MQTT connections). |
| `VICTRON_PASSWORD` | Victron account password. |
| `SENDGRID_API_KEY` | SendGrid API key for transactional email. |
| `AFRICASTALKING_API_KEY` | Africa's Talking API key. |
| `AFRICASTALKING_USERNAME` | Africa's Talking username. |
| `AFRICASTALKING_SHORTCODE` | Africa's Talking shortcode. |
| `AFRICASTALKING_SENDER_ID` | Africa's Talking sender ID. |
| `MAKE_API_URL` | Make.com API base URL. |
| `MAKE_API_TOKEN` | Make.com API token. |
| `MAKE_API_TELEGRAM_NOTIFICATION_WEBHOOK_ID` | Make.com scenario ID for Telegram notifications. |
| `MAKE_API_XERO_AUTO_PAYOUT_FLOW_ID` | Make.com scenario ID for Xero payout automation. |
| `MAKE_CREATE_FOLDER_FLOW_ID` | Make.com scenario ID for folder creation (PD Hero). |
| `MAKE_TEMPLATE_FLOW_ID` | Make.com scenario ID for document templating (PD Hero). |
| `MAKE_SHARE_FILE_FLOW_ID` | Make.com scenario ID for file sharing (PD Hero). |
| `MAKE_PD_HERO_FOLDER_PATH` | Google Drive folder path for PD Hero output. |
| `FLOW_XO_API` | Flow XO API base URL. |
| `FLOW_XO_REVENUE_NOTIFICATION_WEBHOOK_ID` | Flow XO webhook path for revenue Telegram notifications. |
| `MONGO_ATLAS_API` | MongoDB Atlas Data API endpoint. |
| `MONGO_ATLAS_API_KEY` | MongoDB Atlas Data API key. |
| `AYRTON_URL` | Frontend base URL for links in outbound emails and notifications. |
| `EXCHANGE_RATES_API_URL` | Exchange rates API base URL. |
| `EXCHANGE_RATES_API_KEY` | Exchange rates API key. |
| `LOKI_URL` | Grafana Loki push URL for structured logging. |
| `LOKI_APP_NAME` | App label used in Loki log streams. |

---

## Running

```bash
# Development
npx nx serve loch

# Production build
npx nx build loch --configuration=production
```

---

## License

This project is licensed under the [Mozilla Public License 2.0](https://www.mozilla.org/MPL/2.0/). See the [`LICENSE`](../../LICENSE) file at the repository root.
