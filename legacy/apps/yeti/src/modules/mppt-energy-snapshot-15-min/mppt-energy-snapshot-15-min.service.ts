import moment, { DurationInputArg1, DurationInputArg2 } from 'moment';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MpptEnergySnapshot15Min } from '@timeseries/entities/mppt-energy-snapshot-15-min.entity';
import { VictronService } from '@core/modules/victron/victron.service';
import { SupabaseService } from '@core/modules/supabase.module';
import { SUPABASE_QUERY_LIMIT } from '@core/constants';
import { VictronStatsDatapoint } from '@core/modules/victron/victron.types';

type LookbackWindow = { amount: DurationInputArg1; unit: DurationInputArg2; };

const VICTRON_MEASUREMENTS_TO_REQUEST = {
  // { [Victron code]: 'NXT name' }
  'PVP': 'MPPT_KW',
  'pP1': 'PV_INVERTER_KW',
};

// The hour (n / 24) at which we do the super-intensive 96 hour reconciliation
const DAILY_RECONCILIATION_HOUR = 3;

@Injectable()
export class MpptEnergySnapshot15MinService {
  constructor(
    @InjectDataSource('timescale')
    protected readonly timescale: DataSource,
    protected readonly victronService: VictronService,
    private readonly supabaseService: SupabaseService,
  ) { }

  private async takeSnapshot(lookbackWindow: LookbackWindow) {
    const mppts = await this.supabaseService.adminClient
      .from('mppts')
      .select(`
        id,
        external_id,
        mppt_type,
        external_reference,
        external_system,
        installed_at,
        kw,
        azimuth,
        tilt,
        grid:grids!inner(
          id,
          name,
          generation_external_site_id,
          generation_external_system,
          is_automatic_energy_generation_data_sync_enabled,
          location_geom,
          organization:organizations(
            id,
            name
          )
        )
      `)
      .is('deleted_at', null)
      .not('grid.generation_external_site_id', 'is', null)
      .eq('grid.generation_external_system', 'VICTRON')
      .is('grid.is_automatic_energy_generation_data_sync_enabled', true)
      .limit(SUPABASE_QUERY_LIMIT)
      .then(this.supabaseService.handleResponse)
    ;

    let LOOP_COUNT = 0;
    let VICTRON_CALL_COUNT = 0;
    const nowMoment = moment().startOf('hour');
    const lookbackMoment = nowMoment.clone().subtract(lookbackWindow.amount, lookbackWindow.unit);

    // We loop until we reach now
    while(lookbackMoment.isBefore(nowMoment)) {
      const _GRID_CACHE: Record<string, {
        instance: string;
        stats: VictronStatsDatapoint<typeof VICTRON_MEASUREMENTS_TO_REQUEST>[];
      }[]> = { /* grid_external_site_id: installationData */ };

      for(const mppt of mppts) {
        // Add to cache if not exists
        if(!_GRID_CACHE[mppt.grid.generation_external_site_id]) {
          _GRID_CACHE[mppt.grid.generation_external_site_id] = await this.victronService.fetchInstallationInstanceStats(
            mppt.grid.generation_external_site_id,
            VICTRON_MEASUREMENTS_TO_REQUEST,
            {
              interval: '15mins',
              type: 'custom',
              start: lookbackMoment,
              end: lookbackMoment.clone().add(1, 'hour'),
            },
          );
          VICTRON_CALL_COUNT++;
        }

        const mpptData = _GRID_CACHE[mppt.grid.generation_external_site_id]
          .find(({ instance }) => instance === mppt.external_id)
          ?.stats ?? []
        ;

        const toInsert = mpptData.map(({ created_at, MPPT_KW, PV_INVERTER_KW }): MpptEnergySnapshot15Min => {
          // We needed to request different measurments for MPPTs and PV inverters, so pick the applicable one
          const kw = (mppt.mppt_type === 'MPPT' ? MPPT_KW : PV_INVERTER_KW) / 1000;
          return {
            created_at,
            kw,
            grid_id: mppt.grid.id,
            mppt_id: mppt.id,
            grid_name: mppt.grid.name,
            mppt_external_reference: mppt.external_reference,
            mppt_external_system: mppt.external_system,
            mppt_latitude: mppt.grid.location_geom?.coordinates[1],
            mppt_longitude: mppt.grid.location_geom?.coordinates[0],
            mppt_tilt: mppt.tilt,
            mppt_installed_at: new Date(mppt.installed_at),
            mppt_azimuth: mppt.azimuth,
            mppt_kw: mppt.kw,
            organization_name: mppt.grid.organization?.name,
            organization_id: mppt.grid.organization?.id,
            external_id: mppt.external_id,
            mppt_type: mppt.mppt_type,
          };
        });

        await this.timescale
          .createQueryBuilder()
          .insert()
          .into(MpptEnergySnapshot15Min)
          .values(toInsert)
          .orUpdate(
            [ 'kw' ],
            [ 'created_at', 'mppt_id' ],
          )
          .execute()
        ;

        LOOP_COUNT++;
      }

      // Add an hour for the next iteration
      lookbackMoment.add(1, 'hour');
    }
    console.info(`[MPPT ENERGY SNAPSHOT] Took ${ LOOP_COUNT } MPPT snapshots, calling VICTRON API ${ VICTRON_CALL_COUNT } times.`);
  }

  /**
   * Scheduling
  **/

  isTakingSnapshots = false;

  @Cron(CronExpression.EVERY_HOUR, { disabled: process.env.NXT_ENV !== 'production' })
  async takeSnapshotOverPeriod() {
    if (this.isTakingSnapshots) return;
    this.isTakingSnapshots = true;

    const currentHour = moment().hour();
    const lookbackWindow: LookbackWindow = currentHour === DAILY_RECONCILIATION_HOUR
      ? { amount: 4, unit: 'days' }
      : { amount: 1, unit: 'hour' }
    ;

    try {
      await this.takeSnapshot(lookbackWindow);
    }
    catch (err) {
      console.error('[MPPT ENERGY SNAPSHOT] Error taking snapshot', err);
    }
    finally {
      this.isTakingSnapshots = false;
    }
  }
}
