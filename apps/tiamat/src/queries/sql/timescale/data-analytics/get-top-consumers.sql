-- Get the top energy consumers for a grid within a date range
-- Excludes meters hidden from reporting and filters out NaN values

SELECT 
  customer_id, 
  customer_full_name, 
  COALESCE(
    SUM(NULLIF(consumption_kwh, 'NaN'::float)),
    0
  ) AS consumption_kwh
FROM meter_snapshot_1_h
WHERE 
  grid_id = $1
  AND is_hidden_from_reporting = FALSE 
  AND created_at >= $2
  AND created_at < $3
GROUP BY customer_id, customer_full_name
ORDER BY consumption_kwh DESC
LIMIT $4;
