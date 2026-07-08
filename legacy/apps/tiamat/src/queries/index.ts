import { loadQuery } from '@helpers/query-helpers';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

// Meter Commissionings
export type {
  LockNextCommissioningResult,
  LockNextCommissioningParams,
} from './sql/supabase/meter-commissionings/lock-next.types';

// Meter Credit Transfers
export type {
  LockNextCreditTransferPageResult,
  LockNextCreditTransferPageParams,
} from './sql/supabase/meter-credit-transfers/lock-next-page.types';

// Meters
export type {
  LockIssuesPageResult,
  LockIssuesPageParams,
} from './sql/supabase/meters/lock-issues-page.types';

// Directive Batch Executions
export type {
  BatchExecutionStatusCounts,
  BatchExecutionStatusCountsParams,
} from './sql/supabase/directive-batch-executions/count-statuses.types';

// Data Analytics
export type {
  GridUptimeDaily,
  GridUptimeDailyParams,
} from './sql/timescale/data-analytics/get-uptimes.types';
export type {
  TopConsumer,
  TopConsumerParams,
} from './sql/timescale/data-analytics/get-top-consumers.types';

// Lost Revenue
export type {
  MeterAvgConsumptionByDay,
  MeterAvgConsumptionByDayParams,
} from './sql/timescale/lost-revenue/get-avg-consumption.types';

// Payouts
export type {
  MpptDailyUptime,
  MpptDailyUptimeParams,
} from './sql/timescale/payouts/get-mppt-uptimes.types';
export type {
  ExchangeRateSnapshot,
  ExchangeRateSnapshotParams,
} from './sql/timescale/payouts/find-exchange-rate.types';

// Device Messages (Lua Scripts)
export type {
  FetchNextMessageResult,
  FetchNextMessageKeys,
  FetchNextMessageArgv,
} from './lua/device-messages/fetch-next-message-in-queue.types';

export type {
  MoveMessageResult,
  MoveMessageKeys,
  MoveMessageArgv,
} from './lua/device-messages/move-message-between-queues.types';

// -----------------------------------------------------------------------------
// RAW QUERIES
// -----------------------------------------------------------------------------

export const RAW_QUERIES = {
  sql: {
    supabase: {
      meterCommissionings: {
        /**
         * Locks the next meter commissioning for processing
         * Only selects from DCUs that are online and grids with power (HPS on)
         * @returns {void} UPDATE command result
         */
        lockNext: loadQuery('sql/supabase/meter-commissionings/lock-next.sql'),
      },
      meterCreditTransfers: {
        /**
         * Locks a page of meter credit transfers for batch processing
         * Selects pending transfers and updates them to PROCESSING status
         * @returns {void} UPDATE command result
         */
        lockNextPage: loadQuery('sql/supabase/meter-credit-transfers/lock-next-page.sql'),
      },
      meters: {
        /**
         * Locks a page of meters for issue checking
         * Only selects meters with full connection/customer/grid chain that need checking
         * @returns {void} UPDATE command result
         */
        lockIssuesPage: loadQuery('sql/supabase/meters/lock-issues-page.sql'),
      },
      directiveBatchExecutions: {
        /**
         * Aggregates status counts from directives, and meter_interactions
         * Returns pending, processing, successful, failed counts in a single query
         * @returns {BatchExecutionStatusCounts} Single row with aggregated counts
         */
        countStatuses: loadQuery('sql/supabase/directive-batch-executions/count-statuses.sql'),
      },
    },
    timescale: {
      dataAnalytics: {
        /**
         * Returns top energy consumers for a grid within a date range
         * @returns {TopConsumer[]} Array of customers ordered by consumption (descending)
         */
        getTopConsumers: loadQuery('sql/timescale/data-analytics/get-top-consumers.sql'),
        /**
         * Returns daily uptime percentages for HPS and FS over last 30 days
         * @returns {GridUptimeDaily[]} Array of daily uptime data
         */
        getUptimes: loadQuery('sql/timescale/data-analytics/get-uptimes.sql'),
      },
      lostRevenue: {
        /**
         * Returns average daily consumption for specified meters
         * @returns {MeterAvgConsumptionByDay[]} Array of daily average consumption
         */
        getAvgConsumption: loadQuery('sql/timescale/lost-revenue/get-avg-consumption.sql'),
      },
      payouts: {
        /**
         * Returns daily MPPT activity status for a grid (active if output > 30% capacity)
         * @returns {MpptDailyUptime[]} Array of MPPT daily uptime records
         */
        getMpptUptimes: loadQuery('sql/timescale/payouts/get-mppt-uptimes.sql'),
        /**
         * Finds exchange rate for a specific date and currency pair
         * @returns {ExchangeRateSnapshot[]} Array of exchange rate snapshots
         */
        findExchangeRate: loadQuery('sql/timescale/payouts/find-exchange-rate.sql'),
      },
    },
  },
  lua: {
    deviceMessages: {
      /**
       * Atomically fetches highest priority message from source queue, moves to destination,
       * updates status, and returns message data. Prevents race conditions.
       * @returns {FetchNextMessageResult} [messageId, fields[]] or null if queue empty
       */
      fetchNextMessageInQueue: loadQuery('lua/device-messages/fetch-next-message-in-queue.lua'),
      /**
       * Atomically moves a message between queues with a stale-message guard.
       * Only proceeds if the message is present in the source queue (ZREM gate).
       * Prevents phantom hash creation from late-arriving API responses.
       * @returns {MoveMessageResult} 0 if message not in source queue, 1 if moved
       */
      moveMessageBetweenQueues: loadQuery('lua/device-messages/move-message-between-queues.lua'),
    },
  },
};
