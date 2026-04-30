-- Calculate daily solar production per grid using trapezoidal integration
-- Aggregates MPPT power data into daily kWh production values
-- Uses TimescaleDB time_weight for accurate energy calculations

WITH hourly_mppt_averages AS (
  -- Step 1: Calculate hourly average power per MPPT
  SELECT
    time_bucket('1 hour'::interval, created_at) AS time,
    grid_id,
    mppt_id,
    AVG(kw) AS kw
  FROM mppt_energy_snapshot_15_min
  WHERE
    created_at >= $1
    AND created_at < $2
  GROUP BY grid_id, mppt_id, time_bucket('1 hour'::interval, created_at)
),

hourly_grid_totals AS (
  -- Step 2: Sum all MPPT power values per grid per hour
  SELECT
    grid_id,
    time,
    SUM(kw) AS summed_kw
  FROM hourly_mppt_averages
  GROUP BY grid_id, time
),

daily_time_weights AS (
  -- Step 3: Create time-weighted aggregates for trapezoidal integration
  SELECT
    grid_id,
    time_bucket('1 day'::interval, time) AS time,
    time_weight('Trapezoidal', time, summed_kw) AS tw
  FROM hourly_grid_totals
  GROUP BY grid_id, time_bucket('1 day'::interval, time)
)

-- Step 4: Calculate final kWh using integral over time weights
SELECT
  grid_id,
  time,
  integral(tw, 'hour')::double precision AS kwh
FROM daily_time_weights
ORDER BY time DESC;

