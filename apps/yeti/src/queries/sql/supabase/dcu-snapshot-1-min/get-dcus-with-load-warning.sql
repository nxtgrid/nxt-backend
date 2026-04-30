-- Get DCU load status by checking queue capacity against current directive load
-- Returns all DCUs with a flag indicating if they are UNDER their queue capacity threshold
-- is_high_load_threshold_hit: TRUE = has available capacity, FALSE = at or over capacity
-- Used to compute grid-level are_all_dcus_under_high_load_threshold via AND across DCUs

WITH dcu_current_load AS (
  -- Calculate current load per DCU (count of directives in specified statuses)
  SELECT
    dcus.id AS dcu_id,
    COUNT(*) AS directive_count
  FROM directives
  INNER JOIN meters ON meters.id = directives.meter_id
  INNER JOIN dcus ON dcus.id = meters.dcu_id
  WHERE directives.directive_status IN ($1, $2, $3)
  GROUP BY dcus.id
)

-- Check if DCU is under its queue capacity threshold (has available capacity)
-- TRUE = under threshold (capacity available), FALSE = at or over threshold
SELECT
  dcus.grid_id,
  dcus.id AS dcu_id,
  (dcus.queue_buffer_length - COALESCE(dcu_current_load.directive_count, 0)) > 0 AS is_high_load_threshold_hit
FROM dcus
LEFT JOIN dcu_current_load ON dcu_current_load.dcu_id = dcus.id;
