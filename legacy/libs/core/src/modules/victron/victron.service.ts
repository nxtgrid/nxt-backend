import moment from 'moment';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { round } from '@helpers/number-helpers';
import { RateLimit } from 'async-sema';
import { isNil } from 'ramda';
import { decode as decodeJwt } from 'jsonwebtoken';
import { WeatherTypeEnum } from '@core/types/supabase-types';
import {
  getAttributeKeys,
  VictronAttributeCode,
  VictronAttributeMap,
  VictronDevice,
  VictronDiagnostic,
  VictronWeatherIcon,
  VICTRON_WEATHER_ICON_MAP,
  VictronStats,
  VictronStatsDatapoint,
} from './victron.types';

const { VICTRON_API_URL, VICTRON_USERNAME, VICTRON_PASSWORD } = process.env;

type VictronFetchParams = {
  start: number;                       // unix
  end: number;                         // unix
  interval: '15mins' | 'hours';
  type: 'forecast' | 'custom';
  attributeCodes: VictronAttributeCode[];
  show_instance?: boolean;
};

type VictronStatsOptions = {
  interval: '15mins' | 'hours';
  type: 'forecast' | 'custom';
  start: moment.Moment;
  end: moment.Moment;
};

@Injectable()
export class VictronService implements OnModuleInit {
  private rateLimit: any;

  constructor(
    private readonly httpService: HttpService,
  ) {}

  onModuleInit() {
    this.rateLimit = RateLimit(1);
  }

  private authToken: {
    token: string;
    exp: number;
  };

  private async refreshToken() {
    await this.rateLimit();
    const { data } = await this.httpService.axiosRef.post(`${ VICTRON_API_URL }/auth/login`, {
      username: VICTRON_USERNAME,
      password: VICTRON_PASSWORD,
    });

    const token = data?.token;
    if (!token) throw new Error('Could not log into VRM');

    this.authToken = {
      token,
      exp: (decodeJwt(token) as any).exp * 1000,
    };
  }

  private async doFetch(endpoint: string, params?: VictronFetchParams) {
    await this.rateLimit();
    if (!this.authToken || this.authToken.exp - Date.now() < 1000) await this.refreshToken();

    const headers = { 'Content-Type': 'application/json', 'X-Authorization': `Bearer ${ this.authToken.token }` };
    try {
      const { data: { records } } = await this.httpService.axiosRef.get(`${ VICTRON_API_URL }${ endpoint }`, { headers, params });
      return records;
    }
    catch(err) {
      console.warn(`[VICTRON DOFETCH FAILED FOR] ${ endpoint } using params:`, params);
      throw new Error(`Error fetching from Victron with status ${ err.status ?? err.response.status } and reason: ${ err.message ?? err.response.statusText }`);
    }
  }

  /**
   * Fetches all devices for a VRM installation
   * @param installationId - The VRM installation/site ID
   * @returns Array of device information including gateways, chargers, inverters, etc.
   */
  async fetchDevices(installationId: string): Promise<VictronDevice[]> {
    const { devices } = await this.doFetch(`/installations/${ installationId }/system-overview`);
    return devices;
  }

  /**
   * Fetches current weather for a VRM installation location.
   * @param installationId - The VRM installation/site ID
   * @returns Weather type enum value
   */
  async fetchWeather(installationId: string): Promise<WeatherTypeEnum> {
    const weatherData = await this.doFetch(`/installations/${ installationId }/weather`);
    const icon = weatherData?.icon as VictronWeatherIcon | undefined;

    if (icon && icon in VICTRON_WEATHER_ICON_MAP) {
      return VICTRON_WEATHER_ICON_MAP[icon];
    }

    return 'UNKNOWN';
  }

  /**
   * Fetches diagnostics for a VRM installation.
   * Returns current status of various system parameters and alarms.
   * @param installationId - The VRM installation/site ID
   * @returns Array of diagnostic entries with code, rawValue, and formattedValue
   */
  fetchDiagnostics(installationId: string): Promise<VictronDiagnostic[]> {
    // There seems to be a bug in vrm api by where count and page have no effect.
    // It used to work, and then something broke around Oct 27th, 2023.
    // So we don't do pagination at the moment.
    return this.doFetch(`/installations/${ installationId }/diagnostics`);
  }

  /**
   * Fetches stats for all instances within an installation.
   * Returns data grouped by instance, allowing the caller to filter for specific instances.
   * @param installationId - The VRM installation/site ID
   * @param attrMap - Map of VRM attribute codes to local field names
   * @param options - Query options (interval, type, start, end)
   * @returns Array of instance data, each containing instance ID and flattened stats
   */
  async fetchInstallationInstanceStats<const T extends VictronAttributeMap>(
    installationId: string,
    attrMap: T,
    options: VictronStatsOptions,
  ): Promise<{ instance: string; stats: VictronStatsDatapoint<T>[] }[]> {
    const { interval, type, start, end } = options;
    const attributeCodes = getAttributeKeys(attrMap);

    const dataSeries: { instance: number; stats: VictronStats; }[] = await this.doFetch(`/installations/${ installationId }/stats`, {
      start: start.unix(),
      end: end.unix(),
      interval,
      type,
      attributeCodes,
      // If you add `show_instance`, you get an array of objects for every instance, with stats per instance.
      // If you don't, you get a single object with the aggregate stats for the entire installation.
      show_instance: true,
    });

    if (!Array.isArray(dataSeries)) return [];
    return dataSeries.map(({ instance, stats }) => ({
      instance: String(instance), // String because we store them as strings in db
      stats: this._flattenStatsByAttributeMap(stats, attrMap),
    }));
  }

  /**
   * Fetches aggregated stats for an installation (all instances combined).
   * Does not differentiate by instance, returning aggregate data for the whole installation.
   * @param installationId - The VRM installation/site ID
   * @param attrMap - Map of VRM attribute codes to local field names
   * @param options - Query options (interval, type, start, end)
   */
  async fetchInstallationAggregateStats<const T extends VictronAttributeMap>(
    installationId: string,
    attrMap: T,
    options: VictronStatsOptions,
  ): Promise<VictronStatsDatapoint<T>[]> {
    const { interval, type, start, end } = options;
    const attributeCodes = getAttributeKeys(attrMap);
    const stats: VictronStats = await this.doFetch(`/installations/${ installationId }/stats`, {
      start: start.unix(),
      end: end.unix(),
      interval,
      type,
      attributeCodes,
    });

    return this._flattenStatsByAttributeMap(stats, attrMap);
  }

  /**
   * Transforms VRM time series data into a flat array of datapoints.
   * Each datapoint has a created_at timestamp and the requested attributes mapped to local field names.
   * @param stats - Raw time series data from VRM API (keyed by attribute code)
   * @param attrMap - Map of VRM attribute codes to local field names
   * @returns Array of flattened datapoints with timestamps and mapped measurement values
   */
  private _flattenStatsByAttributeMap<T extends Record<string, string>>(stats: VictronStats, attrMap: T): VictronStatsDatapoint<T>[] {
    // Internal type uses Moment for processing, output uses Date
    type InternalDatapoint = { period_start: moment.Moment; created_at: moment.Moment; [key: string]: unknown };
    const dataMap = new Map<number, InternalDatapoint>();

    // We look for the first of the series that is an actual array
    // with the goal of using it as the base for the time intervals;
    for (const [ victronAttributeCode, measurements ] of Object.entries(stats)) {
      if (!Array.isArray(measurements)) continue;

      for (const [ timestamp, measurementValue ] of measurements) {
        // We immediately map to the NXT attribute name
        const nxtAttributeName = attrMap[victronAttributeCode];
        // For existing datapoints we add the measurement, otherwise we create a new datapoint
        const existingDatapoint = dataMap.get(timestamp);

        if(existingDatapoint) {
          existingDatapoint[nxtAttributeName] = Number(measurementValue);
        }
        else {
          // We want to make sure the timestamp is being marked in UTC independently of the machine where it runs
          const timestampMoment = moment.utc(timestamp);
          const newDatapoint = {
            period_start: timestampMoment,
            created_at: timestampMoment,
            [nxtAttributeName]: Number(measurementValue),
          };
          dataMap.set(timestamp, newDatapoint);
        }
      }
    }

    const _parsedData = Array.from(dataMap.values());

    // Now we have an array of datapoints with (often) multiple measurements.
    // But it's not guaranteed that every measurement was passed for every point in time.
    // So, we reconcile this by doing a final reconciliation loop.
    // We also round the values that are valid numbers, and convert Moment to Date.
    const _safeParsedData = _parsedData.map(datapoint => {
      const safeAttrs: Record<string, number | null> = {};
      for(const nxtAttributeName of Object.values(attrMap)) {
        if(isNil(datapoint[nxtAttributeName])) safeAttrs[nxtAttributeName] = null;
        else safeAttrs[nxtAttributeName] = round(datapoint[nxtAttributeName] as number, 2);
      }
      return {
        created_at: datapoint.created_at.toDate(),
        period_start: datapoint.period_start.toDate(),
        ...safeAttrs,
      } as VictronStatsDatapoint<T>;
    });

    return _safeParsedData;
  }
}
