-- Find meter snapshot records for specific meters within a time range
-- Returns all meter consumption data points for the specified period
-- Note: This query appears to be unused but kept for potential future use

SELECT *
FROM meter_snapshot_1_h
WHERE 
  created_at >= $1
  AND created_at < $2
  AND meter_id IN ($3);

