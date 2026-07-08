-- Lock a page of meter credit transfers for processing
-- Selects pending transfers and assigns them to a lock session
-- Used for batch processing of topups, purchases, and other credit operations

WITH transfers_to_lock AS (
  -- Select a page of pending credit transfers
  SELECT id
  FROM meter_credit_transfers
  WHERE meter_credit_transfer_status = $3
  LIMIT $4
  OFFSET $5
)

-- Update selected transfers with lock session and new status
UPDATE meter_credit_transfers
SET
  lock_session = $1,
  meter_credit_transfer_status = $2
WHERE id IN (SELECT id FROM transfers_to_lock);
