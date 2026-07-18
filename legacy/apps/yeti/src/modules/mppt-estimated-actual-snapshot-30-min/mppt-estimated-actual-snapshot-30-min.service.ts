import moment from 'moment';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { SolcastService } from '../solcast/solcast.service';
import { SupabaseService } from '@core/modules/supabase.module';
import { MpptEstimatedActualSnapshot30Min } from '@timeseries/entities/mppt-estimated-actual-snapshot-30-min.entity';
import { SUPABASE_QUERY_LIMIT } from '@core/constants';

@Injectable()
export class MpptEstimatedActualSnapshot30MinService {
  isFetchingEstimatedActualsForecast = false;
  isDownloadingVictronMpptProductionData = false;

  constructor(
    @InjectDataSource('timescale')
    protected readonly timescale: DataSource,
    protected readonly solcastService: SolcastService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Cron('0 */6 * * *', { disabled: process.env.NXT_ENV !== 'production' })
  async create() {
    // @REFACTOR :: We can refactor this with early returns instead of nested try catch blocks
    if (this.isFetchingEstimatedActualsForecast) return;
    this.isFetchingEstimatedActualsForecast = true;

    const { adminClient: supabase, handleResponse } = this.supabaseService;

    try {
      const mppts = await supabase
        .from('mppts')
        .select(`
          id,
          external_reference,
          external_system,
          azimuth,
          kw,
          tilt,
          installed_at,
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

      for (const mppt of mppts) {
        try {
          // No need to do grouping here, since Solcast is storing them in the 30min intervals already
          // @REFACTOR :: Improve typing
          const estimatedActuals: unknown[] = await this.solcastService.get('ESTIMATED_ACTUALS', {
            latitude: mppt.grid.location_geom.coordinates[1],
            longitude: mppt.grid.location_geom.coordinates[0],
            azimuth: mppt.azimuth,
            capacity: mppt.kw,
            tilt: mppt.tilt,
            install_date: moment.utc(mppt.installed_at).format('YYYY-MM-DD'),
          });

          const toInsert = estimatedActuals.map(({ period_end, pv_power_rooftop }): MpptEstimatedActualSnapshot30Min => ({
            // We need to subtract 30 minutes, because Solcast follows period_end
            // but we follow period_start, so the value refers for us to their period_end - 30 min
            created_at: moment.utc(period_end).subtract(30, 'minutes').toDate(),
            grid_id: mppt.grid.id,
            mppt_id: mppt.id,
            estimated_actual_kw: Number(pv_power_rooftop),
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

          await this.timescale
            .createQueryBuilder()
            .insert()
            .into(MpptEstimatedActualSnapshot30Min)
            .values(toInsert)
            .orUpdate(
              [ 'estimated_actual_kw' ], // we are ok with overwriting the latest data
              [ 'created_at', 'mppt_id' ],
            )
            .execute()
            .catch(console.error);
        }
        catch (err) {
          console.error(`Failed for MPTT with ID: ${ mppt.id }`, err);
        }
      }
    }
    catch (err) {
      console.error(err);
    }
    finally {
      this.isFetchingEstimatedActualsForecast = false;
    }
  }
}
