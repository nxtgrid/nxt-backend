-- Calculate daily MPPT uptime/activity status for a grid
-- An MPPT is considered "active" if max output > 30% of rated capacity
-- Uses gapfill to ensure all days are represented for each MPPT

WITH mppt_daily_buckets AS (
  -- Step 1: Get all MPPT assets with daily time buckets (gapfilled)
  SELECT 
    mppt_kw, 
    mppt_external_reference, 
    time_bucket_gapfill('1 day', created_at) AS bucket
  FROM mppt_asset_snapshot_1_d
  WHERE 
    created_at >= $1
    AND created_at < $2
    AND grid_id = $3
  GROUP BY mppt_external_reference, mppt_kw, bucket
),

mppt_max_power_per_day AS (
  -- Step 2: Calculate max power output per MPPT per day
  SELECT 
    time_bucket_gapfill('1 day', created_at) AS bucket,
    mppt_external_reference,
    mppt_kw,
    COALESCE(MAX(kw), 0) AS max_kw
  FROM mppt_energy_snapshot_15_min
  WHERE 
    created_at >= $4
    AND created_at < $5
    AND grid_id = $6
  GROUP BY mppt_external_reference, mppt_kw, bucket
),

mppt_activity_status AS (
  -- Step 3: Determine if MPPT was active (max output > 30% of rated capacity)
  SELECT
    mppt_external_reference,
    mppt_kw,
    bucket,
    CASE
      WHEN max_kw > 0.3 * mppt_kw THEN 1
      ELSE 0
    END AS is_active
  FROM mppt_max_power_per_day
)

-- Step 4: Join asset buckets with activity status
SELECT 
  mppt_daily_buckets.mppt_external_reference,
  mppt_daily_buckets.mppt_kw,
  mppt_daily_buckets.bucket,
  COALESCE(mppt_activity_status.is_active, 0) AS is_active
FROM mppt_daily_buckets
LEFT JOIN mppt_activity_status 
  ON mppt_daily_buckets.mppt_external_reference = mppt_activity_status.mppt_external_reference 
  AND mppt_daily_buckets.bucket = mppt_activity_status.bucket
ORDER BY mppt_daily_buckets.mppt_external_reference, mppt_daily_buckets.bucket;
