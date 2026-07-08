import { round } from '@helpers/number-helpers';
import { HttpService } from '@nestjs/axios';
import { HttpException, Injectable } from '@nestjs/common';
import moment from 'moment';

@Injectable()
export class ExchangeRatesService {
  constructor(
    private readonly httpService: HttpService,
  ) { }

  // Fetching from api
  async fetchFromApiRateFromToByDate(from: string, to: string, date: moment.Moment): Promise<number> {
    const apiKey = process.env.EXCHANGE_RATES_API_KEY;

    const url = `${ process.env.EXCHANGE_RATES_API_URL }/${ date.format('YYYY-MM-DD') }?access_key=${ apiKey }&symbols=${ [ from, to ].join(',') }`;
    const res = await this.httpService.axiosRef.get(url);

    if (!res?.data?.rates) {
      throw new HttpException('Invalid response returned when attempting to get exchange rate information', 500);
    }

    const fromResult = Number(res.data.rates[from]);
    const toResult = Number(res.data.rates[to]);
    return round(toResult / fromResult, 1) ; //need to divide it since the base currency is EUR and we do not want to pay for the api yet (it's paid functionality)
  }
}
