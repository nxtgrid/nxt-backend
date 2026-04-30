# Meter Consumption Edge Function

This Supabase Edge Function retrieves meter consumption data from a TimescaleDB instance.

## Setup

### 1. Configure TimescaleDB Secrets

Set the following secrets in your Supabase project:

```bash
# Set Phoenix (TimescaleDB) connection parameters
supabase secrets set PHOENIX_HOST=your-phoenix-host
supabase secrets set PHOENIX_PORT=5432
supabase secrets set PHOENIX_DATABASE=your-database-name
supabase secrets set PHOENIX_USERNAME=your-username
supabase secrets set PHOENIX_PASSWORD=your-password
```

### 2. Deploy the Function

```bash
supabase functions deploy meter-consumption
```

## Usage

### API Endpoint

```
GET /functions/v1/meter-consumption
```

### Required Parameters

- `FROM`: Start date for the consumption data (ISO format: YYYY-MM-DDTHH:mm:ss.sssZ)
- `TO`: End date for the consumption data (ISO format: YYYY-MM-DDTHH:mm:ss.sssZ)

### Optional Parameters

- `offset`: Number of records to skip (default: 0)
- `pageLimit`: Number of records to return per page (default: 20)

### Example Request

**Using JWT Token:**
```bash
curl -i --location --request GET 'https://your-project.supabase.co/functions/v1/meter-consumption?offset=0&pageLimit=20&FROM=2025-07-11T00:00:00.000Z&TO=2025-07-11T23:59:59.999Z' \
  --header 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  --header 'Content-Type: application/json'
```

**Using API Key:**
```bash
curl -i --location --request GET 'https://your-project.supabase.co/functions/v1/meter-consumption?offset=0&pageLimit=20&FROM=2025-07-11T00:00:00.000Z&TO=2025-07-11T23:59:59.999Z' \
  --header 'X-API-Key: YOUR_API_KEY' \
  --header 'Content-Type: application/json'
```

### Response Format

```json
{
  "total": 72,
  "offset": 0,
  "pageLimit": 20,
  "readings": [
    {
      "timestamp": "2025-07-11T00:00:00.000Z",
      "meterId": "METER_001",
      "energyConsumptionKwh": 15.23,
      "timeIntervalMinutes": 60,
      "customerAccountId": "N/A"
    },
    {
      "timestamp": "2025-07-11T00:00:00.000Z",
      "meterId": "METER_002",
      "energyConsumptionKwh": 8.45,
      "timeIntervalMinutes": 60,
      "customerAccountId": "N/A"
    },
    {
      "timestamp": "2025-07-11T01:00:00.000Z",
      "meterId": "METER_001",
      "energyConsumptionKwh": 0,
      "timeIntervalMinutes": 60,
      "customerAccountId": "N/A"
    }
  ]
}
```

## TimescaleDB Features Used

This function leverages TimescaleDB's powerful time-series capabilities:

- **`time_bucket('1 hour', created_at)`**: Groups data into 1-hour buckets, automatically handling time zone and alignment
- **`generate_series()`**: Creates a complete time series for the requested date range
- **`LEFT JOIN`**: Ensures all hours in the range are included, even those with no data
- **`COALESCE()`**: Returns zero values for hours with no meter readings

This approach ensures you get a complete hourly time series with no gaps, making it perfect for time-series analysis and visualization.

## Database Schema

The function queries the `meter_snapshot_1_h` table which has the following structure:

```sql
CREATE TABLE meter_snapshot_1_h (
  created_at timestamp NOT NULL,
  meter_id int NOT NULL,
  meter_type varchar,
  meter_external_reference varchar,
  meter_external_system varchar,
  meter_phase varchar,
  customer_full_name varchar,
  customer_id int,
  dcu_id int,
  dcu_external_reference varchar,
  dcu_external_system varchar,
  grid_id int,
  organization_id int,
  grid_name varchar,
  organization_name varchar,
  consumption_kwh float8,
  connection_id int,
  power_limit int,
  power_limit_kw float8,
  power_limit_kw_should_be float8,
  is_on boolean,
  should_be_on boolean,
  is_fs_consumption boolean,
  is_hps_consumption boolean,
  is_hidden_from_reporting boolean NOT NULL DEFAULT false,
  is_cabin_meter boolean NOT NULL DEFAULT false,
  kwh_credit_available float4,
  PRIMARY KEY (created_at, meter_id)
);
```

**Key mappings for the API response:**
- `time_bucket('1 hour', created_at)` → `timestamp` (grouped by hourly buckets using TimescaleDB's time_bucket function)
- `meter_external_reference` → `meterId` (individual meter external reference for each meter-hour combination)
- `SUM(consumption_kwh)` → `energyConsumptionKwh` (consumption for each specific meter in each hour)
- `customerAccountId` is set to "N/A" for grouped results
- `timeIntervalMinutes` is hardcoded to 60 (1 hour snapshots)
- Hours with no data for a specific meter return zero values (0.0) for energy consumption
- The query groups by both meter and hour, ensuring each meter-hour combination is represented

## Authentication

This function supports two authentication methods:

### 1. JWT Token Authentication
- Standard Supabase JWT token in the `Authorization: Bearer <token>` header
- User must be authenticated through Supabase Auth

### 2. API Key Authentication
- API key in the `X-API-Key` header
- API key must exist in the `api_keys` table and not be locked (`is_locked = false`)
- API key must be associated with a valid account and organization

## Authorization

This function uses specific authorization logic for data aggregator access:
- Users must belong to NXT Grid (organization_id = 2), OR
- Users must be members of a DATA_AGGREGATOR organization

The same authorization rules apply whether using JWT tokens or API keys.

## Error Handling

The function includes comprehensive error handling for:
- Missing required parameters
- Database connection failures
- Query execution errors
- Authorization failures

---

## License

This project is licensed under the [Mozilla Public License 2.0](https://www.mozilla.org/MPL/2.0/). See the [`LICENSE`](../../../LICENSE) file at the repository root.
