# @timeseries

Shared library providing the TypeORM connection to TimescaleDB and the entity definitions for all time-series snapshot tables.

**Path alias:** `@timeseries` → `libs/timeseries/src`

---

## What it provides

- A named TypeORM data source (`timescale`) pointing at the TimescaleDB instance
- TypeORM entity definitions for all hypertable-style snapshot tables
- A `TimeseriesEntity` base class for snapshot entities
- CLI migration tooling via a separate `ormconfig.ts`

---

## Exported module

`libs/timeseries/src/index.ts` exports a single module:

| Export | Description |
|--------|-------------|
| `TimeseriesTypeOrmModule` | `TypeOrmModule.forRoot({ name: 'timescale', ... })` — registers the TimescaleDB connection and all snapshot entities. |

Import this in your app's `AppModule` to make the `timescale` data source and its entities available:

```typescript
import { TimeseriesTypeOrmModule } from '@timeseries';

@Module({
  imports: [TimeseriesTypeOrmModule, ...],
})
export class AppModule {}
```

Inject the data source by name in services:

```typescript
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

constructor(@InjectDataSource('timescale') private dataSource: DataSource) {}
```

---

## Base class

All snapshot entities extend `TimeseriesEntity`:

```typescript
export abstract class TimeseriesEntity {
  @PrimaryColumn({ type: 'timestamp', nullable: false })
  created_at: Date;
}
```

Additional `@PrimaryColumn` fields (e.g. `meter_id`, `grid_id`) are added per entity to form composite primary keys that match the TimescaleDB hypertable structure.

---

## Entities

| Entity | Table | Description |
|--------|-------|-------------|
| `DcuSnapshot1Min` | `dcu_snapshot_1_min` | DCU state snapshot every minute. |
| `DeviceDataSink` | `device_data_sink` | Raw inbound device data rows. |
| `ExchangeRateSnapshot1D` | `exchange_rate_snapshot_1_d` | Daily USD/NGN (and related) exchange rates. |
| `GridBusinessSnapshot1D` | `grid_business_snapshot_1_d` | Daily per-grid business KPIs (consumption, production, spending, issues). |
| `GridEnergySnapshot15Min` | `grid_energy_snapshot_15_min` | 15-minute grid energy readings from Victron. |
| `GridForecastSnapshot1H` | `grid_forecast_snapshot_1_h` | Hourly Victron consumption and solar yield forecast. |
| `MeterSnapshot1H` | `meter_snapshot_1_h` | Hourly meter consumption from CALIN. |
| `MpptAssetSnapshot1D` | `mppt_asset_snapshot_1_d` | Daily MPPT asset data from Victron. |
| `MpptEnergySnapshot15Min` | `mppt_energy_snapshot_15_min` | 15-minute MPPT energy readings from Victron. |
| `MpptEstimatedActual30Min` | `mppt_estimated_actual_30_min` | Solcast estimated actual PV production (30-min resolution). |
| `MpptForecast30Min` | `mppt_forecast_30_min` | Solcast PV production forecast (30-min resolution). |
| `OrderSnapshot` | `order_snapshot` | Snapshot of order/top-up data for financial reporting. |
| `OrganizationSnapshot1D` | `organization_snapshot_1_d` | Daily per-organization grid count. |
| `RouterSnapshot1Min` | `router_snapshot_1_min` | Router/ZeroTier connectivity state every minute. |

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NXT_TIMESCALE_DB_HOST` | TimescaleDB host. |
| `NXT_TIMESCALE_DB_PORT` | TimescaleDB port. |
| `NXT_TIMESCALE_DB_USERNAME` | TimescaleDB username. |
| `NXT_TIMESCALE_DB_PASSWORD` | TimescaleDB password. |
| `NXT_TIMESCALE_DB_NAME` | TimescaleDB database name. |

---

## Migrations

Database migrations for the TimescaleDB schema are maintained under `libs/timeseries/migration/` and are run via the `ormconfig.ts` DataSource (separate from the runtime module). The migration config uses its own set of environment variable names — see `libs/timeseries/ormconfig.ts` for the exact names expected.

Run the following commands from the `libs/timeseries/` directory:

```bash
# Generate a new migration file
ts-node --transpile-only ../../node_modules/typeorm/cli.js migration:create migration/<name>

# Run pending migrations
ts-node --transpile-only ../../node_modules/typeorm/cli.js -d ormconfig.ts migration:run -t none
```

---

## License

This project is licensed under the [Mozilla Public License 2.0](https://www.mozilla.org/MPL/2.0/). See the [`LICENSE`](../../LICENSE) file at the repository root.
