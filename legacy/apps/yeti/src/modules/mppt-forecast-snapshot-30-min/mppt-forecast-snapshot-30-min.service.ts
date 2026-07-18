import moment from 'moment';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SolcastService } from '../solcast/solcast.service';
import { mapAsyncSequential } from '@helpers/promise-helpers';
import { Cron } from '@nestjs/schedule';
import { chunkifyArray } from '@helpers/array-helpers';
import { SolcastParams } from '@core/types/solcast-params';
import { MpptForecastSnapshot30Min } from '@timeseries/entities/mppt-forecast-30-min.entity';
import { SupabaseService } from '@core/modules/supabase.module';
import { SUPABASE_QUERY_LIMIT } from '@core/constants';

@Injectable()
export class MpptForecastSnapshot30MinService {
  isForecastUpdateRunning = false;

  constructor(
    @InjectDataSource('timescale')
    protected readonly timescale: DataSource,
    protected readonly solcastService: SolcastService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Cron('0 */6 * * *', { disabled: process.env.NXT_ENV !== 'production' })
  async fetchForecast() {
    // @REFACTOR :: We can refactor this with early returns instead of nested try catch blocks
    if (this.isForecastUpdateRunning) return;
    this.isForecastUpdateRunning = true;

    const { adminClient: supabase, handleResponse } = this.supabaseService;

    try {
      const mppts = await supabase
        .from('mppts')
        .select(`
          id,
          kw,
          azimuth,
          tilt,
          installed_at,
          external_reference,
          external_system,
          mppt_type,
          grid:grids!inner(
            id,
            name,
            location_geom,
            generation_external_system,
            is_automatic_energy_generation_data_sync_enabled,
            organization:organizations(
              id,
              name
            )
          )
        `)
        .is('deleted_at', null)
        .not('grid.location_geom', 'is', null)
        .eq('grid.generation_external_system', 'VICTRON')
        .is('grid.is_automatic_energy_generation_data_sync_enabled', true)
        .limit(SUPABASE_QUERY_LIMIT)
        .then(handleResponse)
      ;
      type Mppt = typeof mppts[0];

      const now = moment().second(0).millisecond(0).toDate();

      const fetch48HDataByMppt = async (mppt: Mppt) => {
        const params: SolcastParams = {
          latitude: mppt.grid.location_geom.coordinates[1],
          longitude: mppt.grid.location_geom.coordinates[0],
          capacity: mppt.kw,
          azimuth: mppt.azimuth,
          tilt: mppt.tilt,
          install_date: moment.utc(mppt.installed_at).format('YYYY-MM-DD'),
        };

        const res = await this.solcastService.get('FORECAST', params);

        return res.map(data => ({ mppt, data }));
      };

      // Fetch the data
      const forecastDownloads = await mapAsyncSequential(fetch48HDataByMppt)(mppts);

      // Print errors for the MPPTs that failed
      forecastDownloads.errors.forEach(console.error);

      const datapointsToInsert = forecastDownloads.results
        .flat()
        .map(({ mppt, data: { period_end, pv_power_rooftop } }: { mppt: Mppt, data: any}): MpptForecastSnapshot30Min => ({
          created_at: now,
          updated_at: now,
          // Need to convert to NXT standard, which is to apply data to the beginning of a period
          period_start: moment(period_end).second(0).millisecond(0).subtract(30, 'minutes').toDate(),
          pv_estimate_kw: Number(pv_power_rooftop),
          grid_id: mppt.grid.id,
          mppt_id: mppt.id,
          grid_name: mppt.grid.name,
          mppt_external_reference: mppt.external_reference,
          mppt_external_system: mppt.external_system,
          mppt_latitude: mppt.grid.location_geom.coordinates[1],
          mppt_longitude: mppt.grid.location_geom.coordinates[0],
          mppt_tilt: mppt.tilt,
          mppt_installed_at: new Date(mppt.installed_at),
          mppt_azimuth: mppt.azimuth,
          mppt_kw: mppt.kw,
          organization_id: mppt.grid.organization?.id,
          organization_name: mppt.grid.organization?.name,
          mppt_type: mppt.mppt_type,
        }));

      // Need to split into chunks to avoid rate limits
      const chunks = chunkifyArray(datapointsToInsert, 1000);

      for (const chunk of chunks) {
        // The list of properties needs to be in the same order specified in the map above, otherwise
        // the query builder does not work
        await this.timescale
          .createQueryBuilder()
          .insert()
          .into(MpptForecastSnapshot30Min)
          .values(chunk)
          .orUpdate([
            'updated_at', // We do not override the created_at, but we do with the updated_at
            'pv_estimate_kw',
          ],
          [ 'period_start', 'mppt_id' ])
          .execute()
          .catch(console.error);
      }
    }
    catch (err) {
      console.error(err);
    }
    finally {
      this.isForecastUpdateRunning = false;
    }
  }
}
