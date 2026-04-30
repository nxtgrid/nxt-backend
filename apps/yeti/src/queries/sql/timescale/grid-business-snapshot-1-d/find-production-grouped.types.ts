/**
 * Query parameters for find-production-grouped.sql
 */
export type GridDailyProductionParams = [
  startDate: Date | string,
  endDate: Date | string,
];

/**
 * Result type for find-production-grouped.sql
 *
 * Returns daily solar production per grid calculated using trapezoidal integration
 * of MPPT power data. Uses TimescaleDB time_weight function for accurate
 * energy calculations from power readings.
 */
export type GridDailyProduction = {
  /** Grid database ID */
  grid_id: number;
  /** Day timestamp */
  time: Date;
  /** Total production in kWh for this day */
  kwh: number;
};

