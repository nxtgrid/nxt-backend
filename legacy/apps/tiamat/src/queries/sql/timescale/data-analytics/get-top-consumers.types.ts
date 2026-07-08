/**
 * Query parameters for get-top-consumers.sql
 */
export type TopConsumerParams = [
  gridId: number,
  startDate: Date | string,
  endDate: Date | string,
  limitCount: number,
];

/**
 * Result type for get-top-consumers.sql
 *
 * Returns the top energy consumers for a specific grid within a date range,
 * ordered by total consumption (descending).
 */
export type TopConsumer = {
  /** Customer ID from the database */
  customer_id: number;
  /** Full name of the customer */
  customer_full_name: string;
  /** Total energy consumption in kWh for the period */
  consumption_kwh: number;
};

