-- Find total consumption per connection for lifeline eligibility calculation
-- A connection is considered "lifeline" if total consumption is below a threshold
-- Filters out invalid consumption values (negative or > 5 kWh per reading)

SELECT
  COALESCE(SUM(consumption_kwh), 0) AS total_consumption_kwh,
  connection_id
FROM meter_snapshot_1_h
WHERE
  created_at >= $1
  AND created_at < $2
  AND consumption_kwh >= $3
  AND consumption_kwh <= $4
  AND connection_id = ANY($5)
GROUP BY connection_id;

