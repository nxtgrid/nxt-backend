import { MeterTypeEnum } from '@core/types/supabase-types';

/**
 * Query parameters for find-avg-consumption-by-grid-and-type.sql
 * Note: This query is currently unused (service is commented out).
 */
export type AvgConsumptionByGridAndTypeParams = [
  startDate: string,
  endDate: string,
];

/**
 * Result type for find-avg-consumption-by-grid-and-type.sql
 *
 * Returns average hourly consumption grouped by grid and meter type.
 * Used to estimate lost revenue for open issues.
 *
 * Note: This query is currently unused (service is commented out).
 */
export type AvgConsumptionByGridAndType = {
  /** Grid ID */
  grid_id: number;
  /** Meter type (HPS or FS) */
  meter_type: MeterTypeEnum;
  /** Average hourly consumption in kWh */
  avg: number;
};

