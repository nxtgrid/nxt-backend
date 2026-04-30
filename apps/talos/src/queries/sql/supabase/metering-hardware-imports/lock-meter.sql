-- Lock a batch of pending meter hardware imports for processing
-- Finds meter imports that are ready for installation based on:
-- 1. DCU is online and grid HPS is on (for non-LoRaWAN), OR
-- 2. Meter uses LoRaWAN protocol AND (auto-install enabled OR test mode on)

WITH imports_to_lock AS (
  SELECT metering_hardware_imports.id
  FROM metering_hardware_imports
  INNER JOIN metering_hardware_install_sessions
    ON metering_hardware_install_sessions.id = metering_hardware_imports.metering_hardware_install_session_id
  INNER JOIN meters
    ON meters.id = metering_hardware_install_sessions.meter_id
  INNER JOIN dcus
    ON dcus.id = meters.dcu_id
  INNER JOIN grids
    ON grids.id = dcus.grid_id
  WHERE
    -- Only pending imports without an active lock
    metering_hardware_imports.metering_hardware_import_status = $3
    AND metering_hardware_imports.lock_session IS NULL
    -- Must have a meter assigned
    AND metering_hardware_install_sessions.meter_id IS NOT NULL
    AND (
      -- Option 1: DCU-based installation (non-LoRaWAN)
      -- Requires DCU online and grid HPS on
      (
        dcus.is_online = $4
        AND grids.is_hps_on = $5
        AND dcus.communication_protocol != $6
      )
      OR
      -- Option 2: LoRaWAN meter installation
      -- Requires auto-install enabled OR test mode
      (
        meters.communication_protocol = $7
        AND (
          grids.is_automatic_meter_install_enabled = $8
          OR meters.is_test_mode_on = $9
        )
      )
    )
  LIMIT $10
)

UPDATE metering_hardware_imports
SET
  metering_hardware_import_status = $1,
  lock_session = $2
WHERE metering_hardware_imports.id IN (SELECT id FROM imports_to_lock);

