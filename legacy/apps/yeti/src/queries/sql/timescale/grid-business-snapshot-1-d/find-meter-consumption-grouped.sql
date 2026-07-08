-- Calculate total meter consumption grouped by grid and meter type
-- Returns aggregated consumption for daily business snapshots
-- Used to track FS and HPS consumption separately per grid

SELECT
  grid_id,
  meter_type,
  ROUND(SUM(consumption_kwh)::numeric, 2)::double precision AS total
FROM meter_snapshot_1_h
WHERE
  created_at >= $1
  AND created_at < $2
GROUP BY grid_id, meter_type;

