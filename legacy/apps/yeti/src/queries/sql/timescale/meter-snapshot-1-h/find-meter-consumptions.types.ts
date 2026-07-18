/**
 * Query parameters for find-meter-consumptions.sql
 */
export type MeterConsumptionSnapshotParams = [
  startDate: Date | string,
  endDate: Date | string,
  meterIds: number[],
];

/**
 * Result type for find-meter-consumptions.sql
 *
 * Returns meter snapshot records for specific meters within a time range.
 * Used to fetch historical consumption data for analysis.
 * Note: This query appears to be unused but kept for potential future use.
 */
export type MeterConsumptionSnapshot = {
  /** Meter ID */
  meter_id: number;
  /** Grid ID */
  grid_id: number;
  /** Timestamp of the snapshot */
  created_at: Date;
  /** Energy consumption in kWh */
  consumption_kwh: number;
  /** Additional snapshot fields... */
  [key: string]: unknown;
};

