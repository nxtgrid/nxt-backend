-- Calculate daily uptime percentages for HPS and FS over the last 30 days
-- Uses 15-minute buckets with gapfill to ensure continuous time series
-- FS (Full Service) is only considered "on" when BOTH FS is active AND HPS is on

WITH fifteen_minute_buckets AS (
  -- Step 1: Create 15-minute time buckets with gapfill for the last 30 days
  SELECT
    time_bucket_gapfill('15 minutes', created_at) AS bucket,
    COALESCE(MAX(is_fs_active::int), 0) AS is_fs_active,
    COALESCE(MAX(is_hps_on::int), 0) AS is_hps_on
  FROM grid_energy_snapshot_15_min
  WHERE
    grid_id = $1
    AND created_at > NOW() - INTERVAL '30 days'
    AND created_at < NOW()
  GROUP BY bucket
),

service_status_per_bucket AS (
  -- Step 2: Determine FS status (requires both FS active AND HPS on)
  SELECT
    bucket,
    is_hps_on,
    CASE
      WHEN is_fs_active = 1 AND is_hps_on = 1 THEN 1
      ELSE 0
    END AS is_fs_on
  FROM fifteen_minute_buckets
  WHERE
    bucket > NOW() - INTERVAL '30 days'
    AND bucket < NOW()
)

-- Step 3: Aggregate to daily percentages
SELECT
  time_bucket_gapfill('1 day', bucket) AS t,
  ROUND(SUM(is_hps_on::int)::numeric / COUNT(*), 2) AS is_hps_on,
  ROUND(SUM(is_fs_on::int)::numeric / COUNT(*), 2) AS is_fs_on
FROM service_status_per_bucket
GROUP BY t
ORDER BY t;
