-- Find maximum battery charge current limit (MCC) per grid within a date range
-- Used to determine grid capacity limits for HPS threshold calculations
-- Returns the max MCC value recorded for each grid during the period

SELECT
  grid_id,
  COALESCE(MAX(battery_charge_current_limit_mcc_a), 0) AS battery_charge_current_limit_mcc_a
FROM grid_energy_snapshot_15_min
WHERE
  created_at >= $1
  AND created_at < $2
GROUP BY grid_id;
