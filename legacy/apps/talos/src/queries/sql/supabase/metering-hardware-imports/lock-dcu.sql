-- Lock a batch of pending DCU hardware imports for processing
-- Finds DCU imports that are ready for installation based on:
-- 1. Grid HPS is on (for non-LoRaWAN), OR
-- 2. DCU uses LoRaWAN protocol
-- AND grid has automatic meter install enabled

WITH imports_to_lock AS (
  SELECT metering_hardware_imports.id
  FROM metering_hardware_imports
  INNER JOIN metering_hardware_install_sessions
    ON metering_hardware_install_sessions.id = metering_hardware_imports.metering_hardware_install_session_id
  INNER JOIN dcus
    ON dcus.id = metering_hardware_install_sessions.dcu_id
  INNER JOIN grids
    ON grids.id = dcus.grid_id
  WHERE
    -- Only pending imports without an active lock
    metering_hardware_imports.metering_hardware_import_status = $3
    AND metering_hardware_imports.lock_session IS NULL
    -- Must have a DCU assigned
    AND metering_hardware_install_sessions.dcu_id IS NOT NULL
    AND (
      -- Option 1: Non-LoRaWAN DCU requires grid HPS on
      (
        grids.is_hps_on = $4
        AND dcus.communication_protocol != $5
      )
      OR
      -- Option 2: LoRaWAN DCU can proceed regardless of HPS
      (
        dcus.communication_protocol = $6
      )
    )
    -- Grid must have automatic install enabled
    AND grids.is_automatic_meter_install_enabled = $7
  LIMIT $8
)

UPDATE metering_hardware_imports
SET
  metering_hardware_import_status = $1,
  lock_session = $2
WHERE metering_hardware_imports.id IN (SELECT id FROM imports_to_lock);

