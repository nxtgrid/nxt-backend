import { loadQuery } from '@helpers/query-helpers';

// -----------------------------------------------------------------------------
// TYPES - Supabase
// -----------------------------------------------------------------------------

// Notifications
export type {
  LockedNotification,
  LockNextPageResult,
  LockNextPageParams,
} from './sql/supabase/notifications/lock-next-page.types';

// Lost Revenue (currently unused - service is commented out)
export type {
  IssueStatsByStatus,
  IssueStatsByStatusParams,
} from './sql/supabase/lost-revenue/find-issue-stats-by-status.types';

// -----------------------------------------------------------------------------
// TYPES - Timescale
// -----------------------------------------------------------------------------

// Lifeline
export type {
  LifelineConnectionConsumption,
  LifelineConnectionConsumptionParams,
} from './sql/timescale/lifeline/find-lifeline-connections.types';

// Lost Revenue (currently unused - service is commented out)
export type {
  AvgConsumptionByGridAndType,
  AvgConsumptionByGridAndTypeParams,
} from './sql/timescale/lost-revenue/find-avg-consumption-by-grid-and-type.types';

// -----------------------------------------------------------------------------
// RAW QUERIES
// -----------------------------------------------------------------------------

export const RAW_QUERIES = {
  sql: {
    supabase: {
      notifications: {
        /**
         * Locks a batch of pending notifications for processing
         * The UPDATE sets lock_session; locked notifications are then fetched via Supabase
         * @returns {LockNextPageResult} void (UPDATE query)
         */
        lockNextPage: loadQuery('sql/supabase/notifications/lock-next-page.sql'),
      },
      lostRevenue: {
        /**
         * Gets issue statistics for lost revenue calculations
         * Note: Currently unused (service is commented out)
         * @returns {IssueStatsByStatus[]} Array of issue stats with hours open
         */
        findIssueStatsByStatus: loadQuery('sql/supabase/lost-revenue/find-issue-stats-by-status.sql'),
      },
    },
    timescale: {
      lifeline: {
        /**
         * Finds total consumption per connection for lifeline eligibility
         * @returns {LifelineConnectionConsumption[]} Array of connection consumption totals
         */
        findLifelineConnections: loadQuery('sql/timescale/lifeline/find-lifeline-connections.sql'),
      },
      lostRevenue: {
        /**
         * Gets average consumption grouped by grid and meter type
         * Note: Currently unused (service is commented out)
         * @returns {AvgConsumptionByGridAndType[]} Array of avg consumption by grid/type
         */
        findAvgConsumptionByGridAndType: loadQuery('sql/timescale/lost-revenue/find-avg-consumption-by-grid-and-type.sql'),
      },
    },
  },
};

