/**
 * Query parameters for find-exchange-rate.sql
 */
export type ExchangeRateSnapshotParams = [
  date: string,
  fromCurrency: string,
  toCurrency: string,
];

/**
 * Result type for find-exchange-rate.sql
 *
 * Fetches the exchange rate snapshot for a specific date and currency pair
 * from the daily aggregated exchange rate table.
 */
export interface ExchangeRateSnapshot {
  period_start: Date;
  from_currency: string;
  to_currency: string;
  value: number;
}

