/**
 * Query parameters for get-uptimes.sql
 */
export type GridUptimeDailyParams = [
  gridId: number,
];

/**
 * Result type for get-uptimes.sql
 *
 * Returns daily uptime percentages for HPS (High Priority Service) and FS (Full Service)
 * over the last 30 days for a specific grid. Uses TimescaleDB's time_bucket_gapfill
 * to ensure all days are represented even if data is missing.
 */
export type GridUptimeDaily = {
  /** Day bucket (timestamp) */
  t: Date;
  /** Percentage of time HPS was on during this day (0.00 to 1.00) */
  is_hps_on: number;
  /** Percentage of time FS was on during this day (0.00 to 1.00) */
  is_fs_on: number;
};

