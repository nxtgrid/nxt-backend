-- Calculate daily estimated solar production per grid using trapezoidal integration
-- Aggregates estimated actual MPPT power data into daily kWh values
-- Used for comparing actual vs estimated production in business snapshots

WITH hourly_mppt_averages AS (
  -- Step 1: Calculate hourly average estimated power per MPPT
  SELECT
    time_bucket('1 hour'::interval, created_at) AS time,
    grid_id,
    mppt_id,
    AVG(estimated_actual_kw) AS estimated_actual_kw
  FROM mppt_estimated_actual_snapshot_30_min
  WHERE
    created_at >= $1
    AND created_at < $2
  GROUP BY grid_id, mppt_id, time_bucket('1 hour'::interval, created_at)
),

hourly_grid_totals AS (
  -- Step 2: Sum all MPPT estimated values per grid per hour
  SELECT
    grid_id,
    time,
    SUM(estimated_actual_kw) AS summed_estimated_actual_kw
  FROM hourly_mppt_averages
  GROUP BY grid_id, time
),

daily_time_weights AS (
  -- Step 3: Create time-weighted aggregates for trapezoidal integration
  SELECT
    grid_id,
    time_bucket('1 day'::interval, time) AS time,
    time_weight('Trapezoidal', time, summed_estimated_actual_kw) AS tw
  FROM hourly_grid_totals
  GROUP BY grid_id, time_bucket('1 day'::interval, time)
)

-- Step 4: Calculate final kWh using integral over time weights
SELECT
  time,
  grid_id,
  integral(tw, 'hour')::double precision AS kwh
FROM daily_time_weights
ORDER BY time DESC;

