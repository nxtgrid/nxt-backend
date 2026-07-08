/**
 * Query parameters for get-avg-consumption.sql
 */
export type MeterAvgConsumptionByDayParams = [
  meterIds: number[],
  numberOfDays: number,
];

/**
 * Result type for get-avg-consumption.sql
 *
 * Returns average daily energy consumption for a set of meters over a specified
 * number of days (looking backwards from today). Used for lost revenue calculations.
 */
export type MeterAvgConsumptionByDay = {
  /** Average consumption in kWh for this day across all specified meters */
  avg_consumption: number;
  /** Day bucket (timestamp) */
  date: Date;
};

