# Skyfox

**Skyfox** is an open-source backend platform for managing off-grid and mini-grid electricity systems. It handles payment processing, remote monitoring of production and distribution infrastructure, and remote interaction with smart prepaid electricity meters.

The platform is designed for organizations that operate mini-grids in emerging markets — enabling them to manage customers, meters, grids, payouts, and real-time energy data from a single system.

---

## Table of Contents

- [Architecture](#architecture)
- [Apps](#apps)
- [Libraries](#libraries)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Supabase](#supabase)
- [Building and Running Apps](#building-and-running-apps)
- [Type Checking and Linting](#type-checking-and-linting)
- [Known Issues](#known-issues)
- [License](#license)

---

## Architecture

Skyfox is structured as an **Nx monorepo** containing multiple NestJS backend applications and shared libraries. Each application has a distinct responsibility:

```
skyfox/
├── apps/
│   ├── tiamat/   # Main API — operations, payments, meters, users
│   ├── talos/    # Meter provisioning and hardware registration
│   ├── loch/     # Background jobs, automation, and integrations
│   └── yeti/     # Time-series data collection and grid monitoring
├── libs/
│   ├── core/       # Shared NestJS modules (auth, alerts, etc.)
│   ├── helpers/    # Shared utility functions
│   └── timeseries/ # TimescaleDB integration layer
└── supabase/       # Database migrations, functions, and seed data
```

Authentication is handled via **Supabase Auth**. The primary database is **Supabase (PostgreSQL)**. Time-series data (snapshots, energy readings, forecasts) is stored in a separate **TimescaleDB** instance.

---

## Apps

### `tiamat` — Main Operations API

The primary REST + WebSocket API consumed by the frontend dashboards. Covers:

- **Meter management** — remote meter interactions, device messages, install sessions, directive batches
- **Grid infrastructure** — grids, distribution control units (DCUs), MPPTs
- **Payments** — orders, wallets, payouts, Flutterwave integration
- **Users & organizations** — multi-tenancy, user admin, roles
- **Notifications** — email (SendGrid), SMS (Africa's Talking), Telegram, USSD sessions
- **Field data collection** — EpiCollect integration
- **LoRaWAN** — ChirpStack network server integration
- **Automation** — autopilot, directive watchdog
- **Reporting** — data analytics, CSV/XLSX downloads

### `talos` — Meter Provisioning Service

Handles meter hardware registration and provisioning workflows. Currently supports **CALIN** meters (v1 and v2 API). Designed to accommodate additional meter brands in the future.

### `loch` — Background Jobs & Integrations

Long-running background service responsible for:

- **MQTT monitoring** — subscribes to Victron Energy MQTT brokers for live battery/solar state
- **Automated jobs** — lifeline credit top-ups, revenue updates, autopilot triggers
- **Notification dispatch** — outbound email, SMS, Telegram
- **Third-party integrations** — Make.com automation webhooks, weather data, sunrise/sunset scheduling
- **EpiCollect** — inbound field survey data processing

### `yeti` — Time-Series Data Collector

Periodic data collection and aggregation service writing to TimescaleDB:

- **Snapshots** — meter, grid, MPPT, router, DCU at intervals from 1 minute to 1 day
- **Forecasting** — solar irradiance via Solcast integration
- **Digital twin** — live grid state representation
- **Grid diagnostics** — health and connectivity monitoring
- **Exchange rates** — daily currency rate snapshots

---

## Libraries

### `core`
Shared NestJS modules used across apps: authentication guards, software dev alerting, and other cross-cutting concerns.

### `helpers`
Shared utility functions and TypeScript helpers.

### `timeseries`
Integration layer for TimescaleDB — connection management and shared query utilities.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [NestJS](https://nestjs.com/) |
| Monorepo tooling | [Nx](https://nx.dev/) |
| Language | TypeScript |
| Primary database | [Supabase](https://supabase.com/) (PostgreSQL) |
| Time-series database | [TimescaleDB](https://www.timescale.com/) via [TypeORM](https://typeorm.io/) |
| Authentication | Supabase Auth |
| Real-time | WebSockets (Socket.IO) |
| Messaging | MQTT |
| Email | SendGrid |
| SMS | Africa's Talking |
| Payments | Flutterwave |
| Solar forecasting | Solcast |
| LoRaWAN | ChirpStack |
| Meter hardware | CALIN (v1 + v2 API) |

> **Note on TypeORM:** You will find TypeORM used in two distinct contexts in this codebase.
> The integration with **TimescaleDB** uses TypeORM intentionally and permanently — it is the chosen ORM for that database and will remain so.
> The integration with the **primary Supabase (PostgreSQL) database**, however, is legacy: the project originally used TypeORM there and has been gradually migrating to the Supabase client. That migration is incomplete, so some modules still use TypeORM entities and repositories against the main database. This is known technical debt and contributions that continue the migration are welcome.

---

## Prerequisites

- [Node.js](https://nodejs.org/) (check `.nvmrc` or `package.json` for the required version)
- [Docker](https://www.docker.com/) (required for running Supabase locally)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Nx CLI](https://nx.dev/getting-started/intro) (optional — can use `npx nx`)

---

## Getting Started

```bash
# Install dependencies
npm install

# Start Supabase locally (requires Docker)
npx supabase start

# Copy and fill in environment variables
cp apps/tiamat/.env.example apps/tiamat/.env
cp apps/talos/.env.example apps/talos/.env
cp apps/loch/.env.example apps/loch/.env
cp apps/yeti/.env.example apps/yeti/.env

# Run the main API
npx nx serve tiamat
```

---

## Environment Variables

Each app has a `.env.example` file listing the required environment variables with descriptions. Copy each one to `.env` and fill in the values for your environment before running.

All secrets (API keys, database credentials, passwords) must be provided via environment variables — no credentials are hardcoded in the codebase.

---

## Supabase

### Start a local Supabase session
```bash
npx supabase start
```

### Pull the latest database schema from production
```bash
npx supabase db pull
```

### Reset the local database
```bash
npx supabase db reset
```

### Generate TypeScript types

From a local Supabase instance:
```bash
npm run generate-types:local
```

From a remote/production Supabase project:
```bash
npx supabase login  # if not already logged in
npm run generate-types
```

> **Note:** The generated `Json` type is automatically post-processed to `Record<string, any>` instead of the default recursive union type, allowing TypeScript to properly access properties on JSON fields. The script `.scripts/fix-json-type.js` handles this automatically during type generation.

---

## Building and Running Apps

### Build an app
```bash
npx nx build <app-name>

# Examples:
npx nx build tiamat
npx nx build talos
npx nx build loch
npx nx build yeti

# Build with production configuration
npx nx build <app-name> --configuration=production
```

### Run an app (development)
```bash
npx nx serve <app-name>

# Examples:
npx nx serve tiamat
npx nx serve talos
npx nx serve loch
npx nx serve yeti

# Run with production configuration
npx nx serve <app-name> --configuration=production
```

---

## Type Checking and Linting

```bash
# Type checking only
npm run check-types

# Linting only
npm run eslint

# Both
npm run lint
```

---

## Known Issues

Older packages are causing high CPU usage in some environments. If the Nx process keeps running in the background after stopping a serve command:

```bash
# Find the process
ps aux | grep nx

# Kill it
kill -9 <PID>
```

Alternatively, check Activity Monitor (macOS) or Task Manager (Windows) for a lingering `nx` process.

---

## License

Skyfox is licensed under the [Mozilla Public License 2.0](https://www.mozilla.org/MPL/2.0/). See [LICENSE](./LICENSE) for the full text.

---

## Authors

Skyfox was created by **Bobby Bol** and **Tommaso Girotto**. See [AUTHORS.md](./AUTHORS.md) for details.
