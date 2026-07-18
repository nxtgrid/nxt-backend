import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import moment from 'moment-timezone';

@Injectable()
export class SunriseSunsetService {
  constructor(private httpService: HttpService) {}

  sunriseSunsetApi = 'https://api.sunrise-sunset.org/json';

  async getSunriseAndSunsetByLatAndLngAndTimezone(
    date: moment.Moment,
    lat: number,
    lng: number,
    timezone: string,
  ) {
    return this.httpService
      .get(`${ this.sunriseSunsetApi }`, {
        params: {
          lat: lat,
          lng: lng,
          formatted: 0,
          date: date.format('YYYY-MM-DD'),
        },
      })
      .toPromise()
      .then(res => {
        return res.data.results;
      })
      .catch(() => {
        //todo: the date here is intentionally wrong, just to make things work quickly
        //the goal is to have 06:31 and 18:31 for WAT, which means 05:31 and 17:31 GMT
        //so for now we are going to keep it this way, but in the long term we need to fix the code.
        return {
          sunset: moment.tz(
            {
              year: date.year(),
              month: date.month(),
              date: date.date(),
              hour: 18,
              minute: 31,
            },
            //calin meter saves in shenzhen timezone, so we need to translate into utc
            timezone,
          ),
          sunrise: moment.tz(
            {
              year: date.year(),
              month: date.month(),
              date: date.date(),
              hour: 6,
              minute: 31,
            },
            //calin meter saves in shenzhen timezone, so we need to translate into utc
            timezone,
          ),
        };
      });
  }
}
