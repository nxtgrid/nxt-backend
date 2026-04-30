import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { DataSource } from 'typeorm';
import { InjectConnection } from '@nestjs/typeorm';
import moment from 'moment-timezone';
import { uniq } from 'ramda';
import { mapAsyncSequential } from '@helpers/promise-helpers';
import { ExchangeRateSnapshot1D } from '@timeseries/entities/exchange-rate-snapshot-1-d.entity';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { SupabaseService } from '@core/modules/supabase.module';

@Injectable()
export class ExchangeRateSnapshot1DService {

  constructor(
    @InjectConnection('timescale')
    protected readonly timescale: DataSource,
    private readonly exchangeRatesService: ExchangeRatesService,
    private readonly supabaseService: SupabaseService,
  ) { }

  // Every day at Nigerian ~midnight we fetch exchange rates data
  @Cron(CronExpression.EVERY_DAY_AT_1AM, { disabled: process.env.NXT_ENV !== 'production' })
  async appendExchangeRateSnapshot1D() {
    // Find all grids that we want to keep track of
    const { adminClient: supabase, handleResponse } = this.supabaseService;

    const grids = await supabase
      .from('grids')
      .select('id, timezone')
      .eq('is_hidden_from_reporting', false)
      .then(handleResponse);

    // This has the same effect as reducing
    const timezones: string[] = uniq(grids.map(grid => grid.timezone));

    // Generate the date to query depending on the timezone for each timezone
    const optionsArray = timezones.map(timezone => ({
      from_currency: 'USD',
      to_currency: 'NGN',
      date: moment.tz(timezone).startOf('day'),
    }));

    const getExchangeRate = async ({ from_currency, to_currency, date }) => {
      const value = await this.exchangeRatesService.fetchFromApiRateFromToByDate(from_currency, to_currency, date);
      return {
        from_currency,
        to_currency,
        value,
        period_start: date,
        created_at: moment().toDate(),
      };
    };

    const { results, errors } = await mapAsyncSequential(getExchangeRate)(optionsArray);

    if (errors.length) console.error(errors);

    await this.timescale
      .createQueryBuilder()
      .insert()
      .into(ExchangeRateSnapshot1D)
      .values(results)
      .orUpdate({
        conflict_target: [ 'period_start', 'from_currency', 'to_currency' ],
        overwrite: [
          'value',
        ],
      })
      .execute();
  }
}
