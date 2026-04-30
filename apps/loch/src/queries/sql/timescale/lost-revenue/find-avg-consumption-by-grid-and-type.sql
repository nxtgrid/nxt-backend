-- Get average hourly consumption grouped by grid and meter type
-- Used to estimate lost revenue for open issues
-- Note: This query is currently unused (service is commented out)

SELECT
  grid_id,
  meter_type,
  AVG(consumption_kwh) AS avg
FROM meter_snapshot_1_h
WHERE
  created_at >= $1
  AND created_at < $2
  AND consumption_kwh >= 0
GROUP BY grid_id, meter_type;

