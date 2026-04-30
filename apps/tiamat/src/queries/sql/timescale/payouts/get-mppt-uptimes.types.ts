/**
 * Query parameters for get-mppt-uptimes.sql
 * Note: Parameters are repeated for two different CTEs (asset and energy snapshots)
 */
export type MpptDailyUptimeParams = [
  assetStartDate: Date | string,
  assetEndDate: Date | string,
  assetGridId: number,
  energyStartDate: Date | string,
  energyEndDate: Date | string,
  energyGridId: number,
];

/**
 * Result type for get-mppt-uptimes.sql
 *
 * Returns daily MPPT (Maximum Power Point Tracker) uptime/activity status for a grid.
 * An MPPT is considered "active" if its max power output exceeds 30% of its rated capacity.
 * Uses gapfill to ensure all days and MPPTs are represented even without data.
 */
export type MpptDailyUptime = {
  /** MPPT external reference/identifier */
  mppt_external_reference: string;
  /** MPPT rated capacity in kW */
  mppt_kw: number;
  /** Day bucket (timestamp) */
  bucket: Date;
  /** Whether MPPT was active this day (1 = active, 0 = inactive) */
  is_active: number;
};

