# @core

Shared NestJS library used by all apps in the monorepo. Provides database connections, shared domain entities and services, third-party API clients, and cross-cutting infrastructure modules.

**Path alias:** `@core` → `libs/core/src`

---

## What it provides

- **Database connections** — TypeORM connection to the primary PostgreSQL database (`CoreTypeOrmModule`), raw `pg` pool (`CorePgModule`), and Supabase client (`GlobalSupabaseModule`)
- **Global infrastructure** — HTTP module (`GlobalHttpModule`), structured logging to Loki (`CoreLoggerModule`)
- **Shared domain layer** — TypeORM entities, DTOs, and services for all core mini-grid domain models
- **Third-party clients** — CALIN meter APIs, Victron VRM API, Make.com, Solcast, SendGrid

---

## Exported modules (`libs/core/src/index.ts`)

| Export | Description |
|--------|-------------|
| `CoreTypeOrmModule` | `TypeOrmModule.forRoot` for the primary PostgreSQL database. Registers all core entities. |
| `GlobalHttpModule` | Global `HttpModule` powered by `@nestjs/axios`. |
| `GlobalSupabaseModule` | Provides `SupabaseService` with a typed Supabase client and `throwSupabaseError` helper. |
| `CoreLoggerModule` | Global `LokiService` — Winston logger with Loki transport and console fallback. |
| `CorePgModule` | Global `PgService` — raw `pg` connection pool with `query` and `getClient` helpers. |

Apps also import deeply from `@core/modules/...` for domain services and entities.

---

## Shared types

| File | Description |
|------|-------------|
| `types/core-entity.ts` | `CoreEntity` base class with `id` and `created_at` columns for main DB entities. |
| `types/supabase-types.ts` | Auto-generated and adjusted TypeScript types for the Supabase database schema. |
| `types/device-messaging.ts` | Shared enums for device messaging (e.g. `PhaseEnum`). |
| `types/solcast-type.ts` | Solcast API response types. |

---

## Shared constants

`libs/core/src/constants.ts` — shared application-wide constants such as `SUPABASE_QUERY_LIMIT` and wallet/organization identifiers.

---

## Domain modules

All modules live under `libs/core/src/modules/`. Apps import them directly from `@core/modules/<name>`.

| Module | Description |
|--------|-------------|
| `accounts` | Loads `Account` records with full relations (agent, grid, org, wallet, member). |
| `agents` | Queries agents by grid; loads with account, grid, and wallet relations. |
| `api-keys` | Resolves API keys with associated account relations. |
| `calin` | HTTP client for CALIN v1/v2 and STS token APIs, with retry logic and dev alerts. |
| `connections` | Raw SQL reporting queries — public connections, women impacted, etc. |
| `customers` | Reporting queries for customer groupings. |
| `dcus` | DCU lookups by id, external reference, and system. |
| `energy-tracking` | Queries `grid_business_snapshot_1_d` on TimescaleDB using `time_bucket_gapfill` for energy reporting. |
| `grids` | Grid queries filtered by reporting flags, organization, etc. |
| `issues` | Issue records with meter, customer, and grid relations. |
| `loki` | Winston + Loki transport (backing `CoreLoggerModule`). |
| `make` | Rate-limited POST client to Make.com scenario webhook URLs. |
| `meter-commissionings` | Loads commissioning records by id or session lock. |
| `metering-hardware-imports` | Import records and batch status queries via raw SQL. |
| `metering-hardware-install-sessions` | Install session lookups by id or ids. |
| `meters` | Core meter queries — by external reference, grid, commissioning path. |
| `mppts` | Syncs MPPTs from Victron and Supabase; provides MPPT service used across apps. |
| `notification-parameters` | CRUD stubs for per-grid notification configuration. |
| `orders` | Order/top-up queries with wallet and customer paths. |
| `organizations` | Organization entity. |
| `payouts` | Payout queries by organization or ids. |
| `routers` | Router lookups by grid, external system, and ids. |
| `software-dev-alert` | Sends developer alerts via Make.com (Telegram) and optionally email. |
| `solcast-cache` | DB-backed cache for Solcast API responses, keyed by geo/install parameters. |
| `spending` | Revenue and spending queries via Supabase RPCs and raw SQL. |
| `victron` | Victron VRM API client — JWT auth, rate limiting, site stats, and forecast helpers. |

**Entity-only modules** (no service logic, provide TypeORM entities): `bank-accounts`, `banks`, `connection-requested-meters`, `directive-*`, `directives`, `loans`, `members`, `meter-credit-transfers`, `notes`, `notifications`, `poles`, `transactions`, `ussd-sessions`, `ussd-session-hops`, `wallets`.

---

## Usage

Apps import shared modules at the root level in their `app.module.ts`:

```typescript
import { CoreTypeOrmModule, GlobalSupabaseModule, CoreLoggerModule } from '@core';
import { CoreMetersModule } from '@core/modules/meters/meters.module';
```

Feature modules then inject services from `@core` as normal NestJS providers.

---

## License

This project is licensed under the [Mozilla Public License 2.0](https://www.mozilla.org/MPL/2.0/). See the [`LICENSE`](../../LICENSE) file at the repository root.
