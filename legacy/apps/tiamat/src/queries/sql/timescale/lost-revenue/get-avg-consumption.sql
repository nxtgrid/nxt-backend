-- Calculate average daily energy consumption for specified meters
-- Used for lost revenue analysis by comparing against expected consumption
-- Only includes positive consumption values (filters out negatives and NaN)

SELECT
  AVG(consumption_kwh) AS avg_consumption,
  time_bucket('1 day', created_at) AS date
FROM meter_snapshot_1_h
WHERE
  meter_id = ANY($1)
  AND created_at >= CURRENT_DATE - make_interval(days => $2)
  AND consumption_kwh >= 0
GROUP BY date
ORDER BY date;

