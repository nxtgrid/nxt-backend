/**
 * Query parameters for find-estimated-production-grouped.sql
 */
export type GridDailyEstimatedProductionParams = [
  startDate: Date | string,
  endDate: Date | string,
];

/**
 * Result type for find-estimated-production-grouped.sql
 *
 * Returns daily estimated solar production per grid calculated using
 * trapezoidal integration of estimated actual MPPT power data. Used for
 * comparing actual vs estimated production in business snapshots.
 */
export type GridDailyEstimatedProduction = {
  /** Day timestamp */
  time: Date;
  /** Grid database ID */
  grid_id: number;
  /** Total estimated production in kWh for this day */
  kwh: number;
};

