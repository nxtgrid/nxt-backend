/**
 * Query parameters for find-lifeline-connections.sql
 */
export type LifelineConnectionConsumptionParams = [
  startDate: string,
  endDate: string,
  minConsumption: number,
  maxConsumption: number,
  connectionIds: number[],
];

/**
 * Result type for find-lifeline-connections.sql
 *
 * Returns total consumption per connection within a date range.
 * Used to determine if a connection qualifies as "lifeline" status
 * (below a configurable kWh threshold).
 */
export type LifelineConnectionConsumption = {
  /** Total consumption in kWh for the period */
  total_consumption_kwh: number;
  /** Connection ID */
  connection_id: number;
};

