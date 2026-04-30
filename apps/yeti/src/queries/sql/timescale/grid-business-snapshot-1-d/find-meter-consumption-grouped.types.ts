/**
 * Query parameters for find-meter-consumption-grouped.sql
 */
export type MeterConsumptionByGridAndTypeParams = [
  startDate: Date | string,
  endDate: Date | string,
];

/**
 * Result type for find-meter-consumption-grouped.sql
 *
 * Returns total meter consumption grouped by grid and meter type.
 * Used for creating daily business snapshots that track FS (Full Service)
 * and HPS (High Priority Service) consumption separately.
 */
export type MeterConsumptionByGridAndType = {
  /** Grid database ID */
  grid_id: number;
  /** Meter type (FS or HPS) */
  meter_type: 'FS' | 'HPS';
  /** Total consumption in kWh (rounded to 2 decimal places) */
  total: number;
};

