# Meter Consumption (Odyssey Integration)

External API endpoint that exposes hourly meter consumption data to the [Odyssey](https://www.odysseyenergysolutions.com/) platform for RBF (Results-Based Financing) verification.

## How it works

Odyssey calls our endpoint to fetch meter readings for a given time period (max 24 hours per request). It uses offset-based pagination when the result set exceeds `pageLimit`. During initial setup, Odyssey will backfill historical data by making many sequential requests day-by-day from the earliest date until now.

Only specific LoRaWAN grids are integrated — this is managed on the Odyssey side by configuring the `site` parameter in the integration URL.

## Endpoint

```
GET /meter-consumption?FROM=<iso-date>&TO=<iso-date>&site=<grid-name>&offset=<number>
```

### Authentication

`Authorization: Bearer <api-key>` — the API key must exist in the `api_keys` table and not be locked. Keys are cached in memory for 1 hour.

### Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `FROM` | Yes | Start of date range (ISO 8601, e.g. `2026-04-15T00:00:00.000Z`) |
| `TO` | Yes | End of date range (ISO 8601) |
| `site` | Yes | Grid name (case-insensitive, e.g. `Iyemero` or `iyemero`) |
| `offset` | No | Row offset for pagination (default: `0`) |

### Response

```json
{
  "readings": [
    {
      "timestamp": "2026-04-15T00:00:00.000Z",
      "meterId": "METER_001",
      "energyConsumptionKwh": 0.45,
      "timeIntervalMinutes": 60,
      "customerAccountId": 123
    }
  ],
  "offset": 0,
  "pageLimit": 500,
  "total": 1630
}
```

Odyssey uses `total` and `pageLimit` to calculate the number of pages, incrementing `offset` by `pageLimit` on each subsequent request.

## Data source

Queries the `meter_snapshot_1_h` hypertable in TimescaleDB (via the shared `timescale` TypeORM connection). Rows are filtered by:

- Date range (`FROM` / `TO`)
- Grid name (case-insensitive match on `grid_name`)
- `is_hidden_from_reporting = false`
- Valid `consumption_kwh` (not null, not NaN)

## Logging

Every request is logged with site, date range, offset, pageLimit, total, and number of returned readings. A separator line is logged when a date range is fully served (i.e. `returned < pageLimit`), making it easy to follow the pagination flow in production logs.

## Replaces

This module replaces the Supabase Edge Functions `meter-consumption` and `meter-consumption-2`, which caused stability issues due to per-request database connections and unbounded queries across all grids.

---

## License

This project is licensed under the [Mozilla Public License 2.0](https://www.mozilla.org/MPL/2.0/). See the [`LICENSE`](../../../../../LICENSE) file at the repository root.
