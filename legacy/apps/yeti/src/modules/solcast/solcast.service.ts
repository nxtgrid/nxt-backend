import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import moment from 'moment';
import { SolcastCacheService } from '../solcast-cache/solcast-cache.service';
import { SolcastRequestType } from '@core/types/solcast-type';
import { CreateSolcastCacheDto } from '@core/modules/solcast-cache/dto/create-solcast-cache.dto';
import { SolcastParams } from '@core/types/solcast-params';

@Injectable()
export class SolcastService {
  constructor(
    private readonly httpService: HttpService,
    private readonly solcastCacheService: SolcastCacheService,
  ) { }

  // We fetch every 6 hours
  CACHE_LIFESPAN_DURATION_MINUTES = 30;
  // The cache contains an array of objects that are going to
  cache = {
    'FORECAST': [],
    'ESTIMATED_ACTUALS': [],
  };

  // In order to test with unmetered locations, we can use https://docs.solcast.com.au/#unmetered-locations
  public async get(solcastResquestType: SolcastRequestType, params: SolcastParams) {
    // If the value is already found in the cache, then return it
    const cacheExpirationCutoff = moment().subtract(this.CACHE_LIFESPAN_DURATION_MINUTES, 'minutes');
    const cachedValue = await this.solcastCacheService.find(solcastResquestType, cacheExpirationCutoff, params);
    if (cachedValue) return cachedValue;

    // Otherwise make an actual request
    const url: string = (solcastResquestType === 'FORECAST') ?
      `${ process.env.SOLCAST_API_URL }/data/forecast/rooftop_pv_power` :
      `${ process.env.SOLCAST_API_URL }/data/live/rooftop_pv_power`;

    const { data } = await this.httpService
      .axiosRef
      .get(url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ process.env.SOLCAST_API_TOKEN }`,
        },
        params,
      });

    if (!data) {
      console.info('An error occurred when pulling solcast data');
      // If we return nothing, we are just not going to save anything in database
      return [];
    }

    const resultArray = solcastResquestType === 'FORECAST' ? data.forecasts : data.estimated_actuals;

    // Store found value in cache
    const toCache: CreateSolcastCacheDto = {
      request_type: solcastResquestType,
      azimuth: params.azimuth,
      tilt: params.tilt,
      capacity_kwp: params.capacity,
      install_date: params.install_date,
      response: JSON.stringify(resultArray),
      latitude: params.latitude,
      longitude: params.longitude,
    };

    await this.solcastCacheService.create(toCache);
    return resultArray;
  }
}
