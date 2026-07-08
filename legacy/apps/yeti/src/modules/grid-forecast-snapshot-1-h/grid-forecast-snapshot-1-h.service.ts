import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GridForecastSnapshot1H } from '@timeseries/entities/grid-forecast-snapshot-1-h.entity';
import { VictronService } from '@core/modules/victron/victron.service';
import { SupabaseService } from '@core/modules/supabase.module';
import moment from 'moment';
import { clone } from 'ramda';
import { chunkifyArray } from '@helpers/array-helpers';
import { VictronStatsDatapoint } from '@core/modules/victron/victron.types';

const VICTRON_MEASUREMENTS_TO_REQUEST = {
  // { [Victron code]: 'NXT name' }
  'vrm_consumption_fc': 'consumption_wh',
  'solar_yield_forecast': 'solar_yield_wh',
};

@Injectable()
export class GridForecastSnapshot1HService {
  isVictronDataUpdateRunning = false;

  constructor(
    @InjectDataSource('timescale')
    protected readonly timescale: DataSource,
    protected readonly victronService: VictronService,
    private readonly supabaseService: SupabaseService,
  ) {}

  // Every hour we fetch 15 mins for the next 7 days
  @Cron(CronExpression.EVERY_HOUR, { disabled: process.env.NXT_ENV !== 'production' })
  async fetchForecast() {
    if (process.env.NXT_ENV !== 'production') return;

    if (this.isVictronDataUpdateRunning) return;

    try {
      this.isVictronDataUpdateRunning = true;

      const { adminClient: supabase, handleResponse } = this.supabaseService;
      const grids = await supabase
        .from('grids')
        .select(`
          id,
          name,
          generation_external_site_id,
          generation_external_system,
          is_automatic_energy_generation_data_sync_enabled,
          organization:organizations(
            id,
            name
          )
        `)
        .is('deleted_at', null)
        .eq('generation_external_system', 'VICTRON')
        .eq('is_automatic_energy_generation_data_sync_enabled', true)
        .not('generation_external_site_id', 'is', null)
        .then(handleResponse)
      ;

      // We fetch forecast data for the next 7 days
      const start = moment().startOf('hour');
      const end = moment(start).add(7, 'days');

      for (const grid of grids) {
        const statsData = await this.victronService.fetchInstallationAggregateStats(
          grid.generation_external_site_id,
          VICTRON_MEASUREMENTS_TO_REQUEST,
          { interval: 'hours', type: 'forecast', start, end },
        );

        const datapoints = statsData
          .map(stats => ({ grid, stats }))
          .map(this.parseDatapoint);

        // Need to split it into chunks to avoid memory issues;
        // the more keys we add, the more memory needed.
        const chunks: GridForecastSnapshot1H[][] = chunkifyArray(datapoints, 10);
        for(const chunk of chunks) {
          await this.insertIntoTimescale(chunk);
        }
      }
    }
    catch (err) {
      console.error(err);
    }
    finally {
      this.isVictronDataUpdateRunning = false;
    }
  }

  private parseDatapoint({ grid, stats }: {
    grid: { id: number; name: string; organization: { id: number; name: string; } }
    stats: VictronStatsDatapoint<typeof VICTRON_MEASUREMENTS_TO_REQUEST>;
  }): GridForecastSnapshot1H {
    const now = new Date();
    return {
      ...clone(stats),
      updated_at: now,
      grid_id: grid.id,
      grid_name: grid.name,
      organization_id: grid.organization?.id,
      organization_name: grid.organization?.name,
      created_at: now, // This will be ignored if we are dealing with an update
      solar_yield_kwh: stats.solar_yield_wh / 1000,
      consumption_kwh: stats.consumption_wh / 1000,
    };
  }

  private insertIntoTimescale(chunk: GridForecastSnapshot1H[]) {
    return this.timescale.createQueryBuilder()
      .insert()
      .into(GridForecastSnapshot1H)
      .values(chunk)
      .orUpdate([
        'updated_at',
        'solar_yield_kwh',
        'consumption_kwh',
      ],
      [
        'period_start',
        'grid_id',
      ])
      .execute();
  }
}
