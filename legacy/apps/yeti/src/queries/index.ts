import { loadQuery } from '@helpers/query-helpers';

// -----------------------------------------------------------------------------
// TYPES - Supabase
// -----------------------------------------------------------------------------

// DCU Snapshot
export type {
  DcuWithLoadWarning,
  DcuWithLoadWarningParams,
} from './sql/supabase/dcu-snapshot-1-min/get-dcus-with-load-warning.types';

// Organization Snapshot
export type {
  GridCountByOrganization,
  GridCountByOrganizationParams,
} from './sql/supabase/organization-snapshot-1-d/find-grouped-by-organization.types';

// -----------------------------------------------------------------------------
// TYPES - Timescale
// -----------------------------------------------------------------------------

// Meter Snapshot
export type {
  MeterConsumptionSnapshot,
  MeterConsumptionSnapshotParams,
} from './sql/timescale/meter-snapshot-1-h/find-meter-consumptions.types';

// Grid Energy Snapshot
export type {
  GridMaxMcc,
  GridMaxMccParams,
} from './sql/timescale/grid-energy-snapshot-15-min/find-max-mcc-by-date-range.types';

// Grid Business Snapshot
export type {
  MeterConsumptionByGridAndType,
  MeterConsumptionByGridAndTypeParams,
} from './sql/timescale/grid-business-snapshot-1-d/find-meter-consumption-grouped.types';
export type {
  GridDailyProduction,
  GridDailyProductionParams,
} from './sql/timescale/grid-business-snapshot-1-d/find-production-grouped.types';
export type {
  GridDailyEstimatedProduction,
  GridDailyEstimatedProductionParams,
} from './sql/timescale/grid-business-snapshot-1-d/find-estimated-production-grouped.types';

// -----------------------------------------------------------------------------
// RAW QUERIES
// -----------------------------------------------------------------------------

export const RAW_QUERIES = {
  sql: {
    supabase: {
      dcuSnapshot1Min: {
        /**
         * Returns DCU load status with queue capacity threshold flag
         * Used for monitoring DCU overload conditions
         * @returns {DcuWithLoadWarning[]} Array of DCUs with load warning status
         */
        getDcusWithLoadWarning: loadQuery('sql/supabase/dcu-snapshot-1-min/get-dcus-with-load-warning.sql'),
      },
      organizationSnapshot1D: {
        /**
         * Returns grid counts grouped by organization, filtered by reporting visibility
         * Used for creating daily organization snapshots
         * @returns {GridCountByOrganization[]} Array of organization grid counts
         */
        findGroupedByOrganization: loadQuery('sql/supabase/organization-snapshot-1-d/find-grouped-by-organization.sql'),
      },
    },
    timescale: {
      meterSnapshot1H: {
        /**
         * Returns meter snapshot records for specific meters within a time range
         * Note: This query appears to be unused but kept for potential future use
         * @returns {MeterConsumptionSnapshot[]} Array of meter snapshots
         */
        findMeterConsumptions: loadQuery('sql/timescale/meter-snapshot-1-h/find-meter-consumptions.sql'),
      },
      gridEnergySnapshot15Min: {
        /**
         * Returns maximum battery charge current limit (MCC) per grid
         * Used for HPS threshold calculations
         * @returns {GridMaxMcc[]} Array of grid max MCC values
         */
        findMaxMccByDateRange: loadQuery('sql/timescale/grid-energy-snapshot-15-min/find-max-mcc-by-date-range.sql'),
      },
      gridBusinessSnapshot1D: {
        /**
         * Returns total meter consumption grouped by grid and meter type (FS/HPS)
         * @returns {MeterConsumptionByGridAndType[]} Array of consumption totals
         */
        findMeterConsumptionGrouped: loadQuery('sql/timescale/grid-business-snapshot-1-d/find-meter-consumption-grouped.sql'),
        /**
         * Returns daily solar production per grid using trapezoidal integration
         * @returns {GridDailyProduction[]} Array of daily production values
         */
        findProductionGrouped: loadQuery('sql/timescale/grid-business-snapshot-1-d/find-production-grouped.sql'),
        /**
         * Returns daily estimated solar production per grid
         * @returns {GridDailyEstimatedProduction[]} Array of daily estimated production
         */
        findEstimatedProductionGrouped: loadQuery('sql/timescale/grid-business-snapshot-1-d/find-estimated-production-grouped.sql'),
      },
    },
  },
};

