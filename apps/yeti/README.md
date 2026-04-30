# yeti

Time-series data collection and grid monitoring service. Yeti runs periodic cron jobs that pull data from external sources (Victron, CALIN, Solcast, ZeroTier, exchange rate APIs) and write structured snapshots into TimescaleDB. It also maintains a live grid digital twin via MQTT.

**Default port:** set via `NXT_PORT`

---

## Responsibilities

- Periodic snapshots of meter, grid, MPPT, DCU, and router data at multiple resolutions (1 min to 1 day)
- Solar irradiance forecasting and estimated actuals via Solcast
- Live grid state via Victron MQTT digital twin
- Grid diagnostics and health monitoring
- Exchange rate snapshots for financial reporting
- Inbound device data ingestion endpoint

---

## Modules

### Data collection (snapshots)

| Module | Interval | Description |
|--------|----------|-------------|
| `dcu-snapshot-1-min` | 1 min | Syncs CALIN DCU status into Timescale; updates Supabase DCU state for tracked grids. |
| `router-snapshot-1-min` | 1 min | Syncs ZeroTier nodes to router records; writes `RouterSnapshot1Min` rows to Timescale. |
| `grid-energy-snapshot-15-min` | 15 min | Pulls Victron site stats and writes grid energy snapshots to Timescale. |
| `mppt-energy-snapshot-15-min` | 15 min | Writes MPPT energy snapshots from Victron per charge controller. |
| `mppt-estimated-actual-snapshot-30-min` | 6 h | Solcast "estimated actuals" (past production) per MPPT into Timescale. |
| `mppt-forecast-snapshot-30-min` | 6 h | Solcast PV production forecast per MPPT into Timescale. |
| `grid-forecast-snapshot-1-h` | 1 h | Victron consumption and solar yield forecast for the coming week into Timescale. |
| `meter-snapshot-1-h` | 1 h / daily | Hourly/daily CALIN meter consumption sync, power limit updates, and issue management. Exposes an HTTP controller. |
| `grid-business-snapshot-1-d` | daily | Per-grid business KPI snapshots: consumption, production, spending, issues, Victron diagnostics. |
| `mppt-asset-snapshot-1-d` | daily | Daily Victron MPPT asset sync and MPPT asset snapshots in Timescale. |
| `organization-snapshot-1-d` | daily | Records per-organization grid counts into Timescale. |
| `exchange-rate-snapshot-1-d` | daily | USD→NGN (and related) exchange rate snapshots per reporting timezone. |

### Infrastructure and supporting modules

| Module | Description |
|--------|-------------|
| `grid-digital-twin` | On startup (production): subscribes to Victron MQTT topics for near-real-time grid power and battery state. |
| `grid-diagnostics` | Reads Victron diagnostics, updates grid fields (e.g. three-phase), and raises or resolves typed grid issues. |
| `device-data-sink` | `POST /device-data-sink/ingest` — appends raw rows to the `DeviceDataSink` Timescale table. |
| `calin` | Global facade over CALIN v1, v2, and LoRaWAN services for meter consumption and DCU/concentrator data. |
| `mppts` | Re-exports core `MpptsService` with the `Mppt` TypeORM entity for app-wide MPPT access. |
| `routers` | Global router CRUD service with the `Router` TypeORM entity, used by snapshot modules. |
| `exchange-rates` | Global HTTP client to a historical exchange rates API (EUR-based cross-rates). |
| `solcast` | Global Solcast client for rooftop PV forecast and live irradiance APIs. |
| `solcast-cache` | TypeORM-backed cache for Solcast API responses, keyed by geo/install parameters. |
| `zerotier` | Global ZeroTier client — lists network members for router connectivity tracking. |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in all values before running.

| Variable | Description |
|----------|-------------|
| `IS_HIBERNATED` | Set to `true` to start with no modules loaded (idle/standby mode). |
| `NXT_PORT` | HTTP listen port. |
| `NXT_ENV` | Environment name. Cron jobs and MQTT digital twin are only active when set to `production`. |
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
| `VICTRON_API_URL` | Victron VRM API base URL. |
| `VICTRON_API_TOKEN` | Victron API token. |
| `VICTRON_USERNAME` | Victron account username (used for MQTT digital twin). |
| `VICTRON_PASSWORD` | Victron account password. |
| `SOLCAST_API_URL` | Solcast API base URL. |
| `SOLCAST_API_TOKEN` | Solcast API bearer token. |
| `CALIN_V1_API` | CALIN v1 API base URL. |
| `CALIN_V1_COMPANY_NAME` | CALIN v1 company name. |
| `CALIN_V1_PASSWORD` | CALIN v1 password. |
| `CALIN_V1_POS_USERNAME` | CALIN v1 POS username. |
| `CALIN_V1_MAINTENANCE_USERNAME` | CALIN v1 maintenance username. |
| `CALIN_V2_API` | CALIN v2 API base URL. |
| `CALIN_V2_COMPANY_NAME` | CALIN v2 company name. |
| `CALIN_V2_PASSWORD` | CALIN v2 password. |
| `CALIN_V2_ADMIN_USERNAME` | CALIN v2 admin username. |
| `CALIN_V2_CUSTOMER_NAME` | CALIN v2 customer name. |
| `TIAMAT_API` | Tiamat service base URL. |
| `TIAMAT_API_KEY` | Tiamat API key (`X-API-KEY` header). |
| `ZEROTIER_API` | ZeroTier Central API base URL. |
| `ZEROTIER_TOKEN` | ZeroTier API token. |
| `ZEROTIER_NETWORK` | ZeroTier network ID for member listing. |
| `EXCHANGE_RATES_API_URL` | Exchange rates API base URL. |
| `EXCHANGE_RATES_API_KEY` | Exchange rates API key. |
| `CHIRPSTACK_API_URL` | ChirpStack network server URL. |
| `CHIRPSTACK_API_TOKEN` | ChirpStack API token. |
| `CHIRPSTACK_APPLICATION_ID` | ChirpStack application ID. |
| `CHIRPSTACK_TENANT_ID` | ChirpStack tenant ID. |
| `CHIRPSTACK_PROFILE_ID` | ChirpStack device profile ID. |
| `SENDGRID_API_KEY` | SendGrid API key (used by shared alert modules). |
| `MAKE_API_URL` | Make.com API base URL. |
| `MAKE_API_SOFTWARE_DEV_ALERT_ID` | Make.com scenario ID for dev alerts. |
| `LOKI_URL` | Grafana Loki push URL for structured logging. |
| `LOKI_APP_NAME` | App label used in Loki log streams. |

---

## Running

```bash
# Development
npx nx serve yeti

# Production build
npx nx build yeti --configuration=production
```

---

## License

This project is licensed under the [Mozilla Public License 2.0](https://www.mozilla.org/MPL/2.0/). See the [`LICENSE`](../../LICENSE) file at the repository root.
