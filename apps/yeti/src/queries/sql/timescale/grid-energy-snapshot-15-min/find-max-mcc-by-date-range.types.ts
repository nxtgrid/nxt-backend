/**
 * Query parameters for find-max-mcc-by-date-range.sql
 */
export type GridMaxMccParams = [
  startDate: Date | string,
  endDate: Date | string,
];

/**
 * Result type for find-max-mcc-by-date-range.sql
 *
 * Returns the maximum battery charge current limit (MCC) recorded per grid
 * within a specified time range. Used to determine grid capacity limits
 * for HPS threshold calculations.
 */
export type GridMaxMcc = {
  /** Grid database ID */
  grid_id: number;
  /** Maximum battery charge current limit in Amps */
  battery_charge_current_limit_mcc_a: number;
};

