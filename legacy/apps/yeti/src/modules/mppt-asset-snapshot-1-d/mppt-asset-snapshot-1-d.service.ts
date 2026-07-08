import moment from 'moment';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { DataSource } from 'typeorm';

import { SupabaseService } from '@core/modules/supabase.module';
import { MpptsService } from '@core/modules/mppts/mppts.service';
import { MpptAssetSnapshot1D } from '@timeseries/entities/mppt-asset-snapshot-1-d.entity';

@Injectable()
export class MpptAssetSnapshot1DService {
  isMpptSyncRunning = false;
  isAssetSyncRunning = false;

  constructor(
    @InjectDataSource('timescale')
    protected readonly timescale: DataSource,
    protected readonly httpService: HttpService,
    protected readonly supabaseService: SupabaseService,
    private readonly mpptsService: MpptsService,
  ) {}

  // Every day at 1 AM we update the list of mppts
  @Cron(CronExpression.EVERY_DAY_AT_1AM, { disabled: process.env.NXT_ENV !== 'production' })
  async syncMppts() {
    if(this.isMpptSyncRunning) return;
    this.isMpptSyncRunning = true;

    try {
      const grids = await this.supabaseService.adminClient
        .from('grids')
        .select('id')
        .is('deleted_at', null)
        .is('is_automatic_energy_generation_data_sync_enabled', true)
        .then(this.supabaseService.handleResponse)
      ;

      for(const grid of grids) {
        await this.mpptsService.syncGrid(grid.id);
      }
    }
    catch(err) {
      console.error('[MPPT GRID SYNC] Error', err);
    }
    finally{
      this.isMpptSyncRunning = false;
    }
  }

  // Every day at 5 AM (we have given 4 hours for the above sync to complete) we add today's snapshot to Timescale.
  // 1) For every grid we get all MPPTs
  // 2) For each MPPT we check the diff with the ones that are already available in our db
  // 3) We take a snapshot of all MPPTs and record them in Timeseries
  @Cron(CronExpression.EVERY_DAY_AT_5AM, { disabled: process.env.NXT_ENV !== 'production' })
  async syncMpptAssets() {
    if (this.isAssetSyncRunning) return;
    this.isAssetSyncRunning = true;

    const { adminClient: supabase, handleResponse } = this.supabaseService;

    try {
      const grids = await supabase
        .from('grids')
        .select(`
          id,
          name,
          location_geom,
          organization:organizations(
            id,
            name
          )
        `)
        .is('deleted_at', null)
        .eq('generation_external_system', 'VICTRON')
        .is('is_automatic_energy_generation_data_sync_enabled', true)
        .then(handleResponse)
      ;

      const startOfToday = moment().startOf('day').toDate();

      for (const grid of grids) {
        try {
          const mppts = await supabase
            .from('mppts')
            .select(`
              id,
              external_reference,
              external_system,
              installed_at,
              kw,
              azimuth,
              tilt,
              external_id,
              mppt_type
            `)
            .eq('grid_id', grid.id)
            .is('deleted_at', null)
            .then(handleResponse)
          ;

          const mpptToInsertIntoTimescale: MpptAssetSnapshot1D[] = mppts.map(mppt => ({
            created_at: startOfToday,
            mppt_id: mppt.id,
            mppt_external_reference: mppt.external_reference,
            mppt_external_system: mppt.external_system,
            mppt_latitude: grid.location_geom.coordinates[1],
            mppt_longitude: grid.location_geom.coordinates[0],
            mppt_tilt: mppt.tilt,
            mppt_installed_at: new Date(mppt.installed_at),
            mppt_azimuth: mppt.azimuth,
            mppt_kw: mppt.kw,
            grid_id: grid.id,
            grid_name: grid.name,
            organization_id: grid.organization.id,
            organization_name: grid.organization.name,
            mppt_external_id: mppt.external_id,
            mppt_type: mppt.mppt_type,
          }));

          await this.timescale
            .createQueryBuilder()
            .insert()
            .into(MpptAssetSnapshot1D)
            .values(mpptToInsertIntoTimescale)
            .orIgnore()
            .execute()
          ;
        }
        catch (err) {
          console.error(`[MPPT ASSET GRID SYNC] Error for ${ grid.name }`, err);
        }
      }
    }
    catch (err) {
      console.error('[MPPT ASSET GRID SYNC] Error', err);
    }
    finally {
      this.isAssetSyncRunning = false;
    }
  }
}
