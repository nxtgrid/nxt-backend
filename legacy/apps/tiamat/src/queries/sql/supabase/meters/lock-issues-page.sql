-- Lock a page of meters for issue checking
-- Selects meters with full connection/customer/grid chain that haven't been checked recently
-- Used by the issues service to periodically scan meters for problems

WITH meters_to_check AS (
  -- Find meters that need issue checking
  SELECT meters.id
  FROM meters
  INNER JOIN connections ON connections.id = meters.connection_id
  INNER JOIN customers ON customers.id = connections.customer_id
  WHERE
    meters.connection_id IS NOT NULL
    AND connections.customer_id IS NOT NULL
    AND customers.grid_id IS NOT NULL
    AND (
      meters.issue_check_last_run_at < $3
      OR meters.issue_check_last_run_at IS NULL
    )
  LIMIT $4
)

-- Update selected meters with execution session and timestamp
UPDATE meters
SET
  issue_check_execution_session = $1,
  issue_check_last_run_at = $2
WHERE id IN (SELECT id FROM meters_to_check);
