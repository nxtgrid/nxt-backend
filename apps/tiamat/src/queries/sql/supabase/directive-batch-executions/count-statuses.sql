-- Aggregates status counts from meter interactions
-- Returns a single row with pending, processing, successful, failed counts
-- Used by directive-batch-executions.service to calculate delivery percentages
-- Parameters:
--   $1: batch_execution_id
--   $2: pending statuses array (e.g., ['QUEUED', 'DEFERRED'])
--   $3: processing statuses array (e.g., ['PROCESSING'])
--   $4: successful statuses array (e.g., ['SUCCESSFUL'])
--   $5: failed statuses array (e.g., ['FAILED', 'ABORTED'])

SELECT
  COUNT(*) FILTER (WHERE meter_interaction_status = ANY($2::meter_interaction_status_enum[]))::int AS pending,
  COUNT(*) FILTER (WHERE meter_interaction_status = ANY($3::meter_interaction_status_enum[]))::int AS processing,
  COUNT(*) FILTER (WHERE meter_interaction_status = ANY($4::meter_interaction_status_enum[]))::int AS successful,
  COUNT(*) FILTER (WHERE meter_interaction_status = ANY($5::meter_interaction_status_enum[]))::int AS failed
FROM meter_interactions
WHERE batch_execution_id = $1;
