import { loadQuery } from '@helpers/query-helpers';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

// Metering Hardware Imports
export type {
  LockMeterResult,
  LockMeterParams,
} from './sql/supabase/metering-hardware-imports/lock-meter.types';
export type {
  LockDcuResult,
  LockDcuParams,
} from './sql/supabase/metering-hardware-imports/lock-dcu.types';

// -----------------------------------------------------------------------------
// RAW QUERIES
// -----------------------------------------------------------------------------

export const RAW_QUERIES = {
  sql: {
    supabase: {
      meteringHardwareImports: {
        /**
         * Locks pending meter hardware imports for processing
         * Checks DCU online status, grid HPS, and protocol compatibility
         * @returns {LockMeterResult} void (UPDATE query)
         */
        lockMeter: loadQuery('sql/supabase/metering-hardware-imports/lock-meter.sql'),
        /**
         * Locks pending DCU hardware imports for processing
         * Checks grid HPS status and protocol compatibility
         * @returns {LockDcuResult} void (UPDATE query)
         */
        lockDcu: loadQuery('sql/supabase/metering-hardware-imports/lock-dcu.sql'),
      },
    },
  },
};

