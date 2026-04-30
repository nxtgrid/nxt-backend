-- Find exchange rate for a specific date and currency pair
-- Returns the exchange rate snapshot from the daily aggregated table

select *
from exchange_rate_snapshot_1_d
where date(period_start) = $1
  and from_currency = $2
  and to_currency = $3

