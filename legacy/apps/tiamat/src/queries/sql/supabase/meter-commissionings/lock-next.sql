-- Lock the next meter commissioning for processing
-- Selects oldest PENDING commissioning where the DCU is online and grid has power
-- Assigns it to a lock session and changes status to PROCESSING

WITH commissioning_to_lock AS (
  -- Find the oldest pending commissioning that's ready to process
  SELECT meter_commissionings.id
  FROM meter_commissionings
  INNER JOIN metering_hardware_install_sessions
    ON metering_hardware_install_sessions.id = meter_commissionings.metering_hardware_install_session_id
  INNER JOIN meters
    ON meters.id = metering_hardware_install_sessions.meter_id
  INNER JOIN dcus
    ON dcus.id = meters.dcu_id
  INNER JOIN grids
    ON grids.id = dcus.grid_id
  WHERE
    meter_commissionings.lock_session IS NULL
    AND meter_commissionings.meter_commissioning_status = $3
    AND dcus.is_online = $4
    AND grids.is_hps_on = $5
    AND meters.communication_protocol != 'CALIN_LORAWAN'
  ORDER BY meter_commissionings.created_at ASC
  LIMIT $6
)

-- Update selected commissioning with lock session and new status
UPDATE meter_commissionings
SET
  lock_session = $1,
  meter_commissioning_status = $2
WHERE id IN (SELECT id FROM commissioning_to_lock);
