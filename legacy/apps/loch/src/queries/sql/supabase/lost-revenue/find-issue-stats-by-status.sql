-- Get issue statistics for calculating lost revenue
-- Returns issues with meter info and hours since creation
-- Note: This query is currently unused (service is commented out)

SELECT
  issues.id,
  issues.created_at,
  issues.closed_at,
  EXTRACT(EPOCH FROM (NOW() - issues.created_at)) / 3600 AS hours,
  customers.grid_id,
  meters.meter_type
FROM issues
INNER JOIN meters ON meters.id = issues.meter_id
INNER JOIN connections ON connections.id = meters.connection_id
INNER JOIN customers ON customers.id = connections.customer_id
WHERE
  issues.issue_status = $1
  AND issues.meter_id IS NOT NULL
  AND meters.connection_id IS NOT NULL
  AND customers.grid_id IS NOT NULL
ORDER BY issues.created_at DESC
LIMIT $2
OFFSET $3;

