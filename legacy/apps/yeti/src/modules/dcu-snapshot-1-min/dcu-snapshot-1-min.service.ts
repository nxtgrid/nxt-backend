import { Injectable } from '@nestjs/common';
import moment from 'moment';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { DcuSnapshot1Min } from '@timeseries/entities/dcu-snapshot-1-min.entity';
import { chunkifyArray } from '@helpers/array-helpers';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CalinService } from '../calin/calin.service';
import { CalinConcentrator } from './dto/calin-concentrator';
import { PgService } from '@core/modules/core-pg';
import { RAW_QUERIES, DcuWithLoadWarning, DcuWithLoadWarningParams } from '@yeti/queries';
import { SupabaseService } from '@core/modules/supabase.module';

@Injectable()
export class DcuSnapshot1MinService {
  constructor(
    @InjectDataSource('timescale')
    protected readonly timescale: DataSource,
    private readonly calinService: CalinService,
    private readonly supabaseService: SupabaseService,
    private readonly pgService: PgService,
  ) {}

  isDcuStatusUpdateRunning = false;

  @Cron(CronExpression.EVERY_MINUTE, { disabled: process.env.NXT_ENV !== 'production' })
  async takeSnapshotAndUpdateDcus() {
    if (this.isDcuStatusUpdateRunning) return;
    this.isDcuStatusUpdateRunning = true;

    const { handleResponse, adminClient: supabase } = this.supabaseService;

    try {
      const calinConcentrators: CalinConcentrator[] = await this.calinService.getConcentrators();

      const calinDcus = await supabase
        .from('dcus')
        .select(`
          id,
          external_reference,
          external_system,
          last_online_at,
          grid:grids!inner(
            id,
            name,
            organization:organizations(
              id,
              name
            )
          )
        `)
        .eq('external_system', 'CALIN')
        .eq('grid.is_dcu_connectivity_tracking_enabled', true)
        .then(handleResponse)
      ;

      // Since the there can be more than one DCU belonging to a grid, we remove duplicates.
      // An alternative way of doing this would be to make another query, but since this is
      // happening every minute we optimize already a bit. ..??
      const timescaleData: DcuSnapshot1Min[] = [];
      // const gridsToUpdateMap: Record<string, {
      //   are_all_dcus_online?: boolean;
      //   // are_all_dcus_under_high_load_threshold?: boolean;
      // }> = {};
      const now = (new Date()).toISOString();

      for (const concentrator of calinConcentrators) {
        const dcu = calinDcus.find(({ external_reference }) => external_reference === concentrator.external_reference);
        if (!dcu) continue;

        await supabase
          .from('dcus')
          .update({
            is_online: concentrator.is_online,
            is_online_updated_at: now,
            last_online_at: concentrator.is_online ? now : dcu.last_online_at,
          })
          .eq('id', dcu.id)
          .then(handleResponse)
        ;

        timescaleData.push({
          created_at: moment().startOf('minute').toDate(),
          dcu_id: dcu.id,
          is_online: concentrator.is_online,
          dcu_external_system: dcu.external_system,
          dcu_external_reference: dcu.external_reference,
          grid_id: dcu.grid.id,
          grid_name: dcu.grid.name,
          organization_name: dcu.grid.organization?.name,
          organization_id: dcu.grid.organization?.id,
        });

        // const gridToUpdate = gridsToUpdateMap[dcu.grid.id];

        // // If there was already a previous DCU that was being used in the same grid,
        // // then the grid "are_all_dcus_online" field will be a result of an and condition
        // if (gridToUpdate) {
        //   gridToUpdate.are_all_dcus_online = concentrator.is_online && gridToUpdate.are_all_dcus_online;
        // }
        // else {
        //   gridsToUpdateMap[dcu.grid.id] = { are_all_dcus_online: concentrator.is_online };
        // }
      }

      // Read the current load of all DCUs
      // @TODO :: Improve this when we have answers about load warnings.
      // const dcusWithCurrentLoadWarning = await this.findAndAddConditionalLoadWarning();

      // for (const dcu of dcusWithCurrentLoadWarning) {
      //   if (!dcu.grid_id) continue;
      //   const gridToUpdate = gridsToUpdateMap[dcu.grid_id];

      //   if (gridToUpdate) {
      //     if (typeof gridToUpdate.are_all_dcus_under_high_load_threshold === 'boolean') {
      //       // To determine the grid field "are_all_dcus_under_high_load_threshold", we want ALL dcus
      //       // to be under the maximum load threshold. In order for that to happen, at every iteration
      //       // we can say: "the total computed threshold, across all dcus, is the && across all those dcus".
      //       // Logically, that's the equivalent, at every iteration, of saying: "the new total computed
      //       // value of the alarm is the computation of all the previous dcus analysed so far, && with the
      //       // current dcu we are analysing right now"
      //       gridToUpdate.are_all_dcus_under_high_load_threshold = dcu.is_high_load_threshold_hit && gridToUpdate.are_all_dcus_under_high_load_threshold;
      //     }
      //     else {
      //       gridToUpdate.are_all_dcus_under_high_load_threshold = dcu.is_high_load_threshold_hit;
      //     }
      //   }
      //   else {
      //     gridsToUpdateMap[dcu.grid_id] = { are_all_dcus_under_high_load_threshold: dcu.is_high_load_threshold_hit };
      //   }
      // }

      await this.insertIntoTimescale(timescaleData);

      // for(const [ gridId, toUpdate ] of Object.entries(gridsToUpdateMap)) {
      //   await supabase
      //     .from('grids')
      //     .update(toUpdate)
      //     .eq('id', Number(gridId))
      //     .then(handleResponse)
      //   ;
      // }
    }
    catch (err) {
      console.error('[DCU Snapshot 1 minute]', err.message);
    }
    finally {
      this.isDcuStatusUpdateRunning = false;
    }
  }

  private async insertIntoTimescale(timescaleData: DcuSnapshot1Min[]) {
    const chunks = chunkifyArray(timescaleData, 1000);
    for(const chunk of chunks) {
      await this.timescale
        .createQueryBuilder()
        .insert()
        .into(DcuSnapshot1Min)
        .values(chunk)
        .orIgnore()
        .execute()
      ;
    }
  }

  // @TOCHECK :: This appears to time out?
  // @TODO :: Improve this completely using Supabase when we have only meter interactions
  private async findAndAddConditionalLoadWarning() {
    const params: DcuWithLoadWarningParams = [
      'RECEIVED_BY_API',
      'INITIALISED',
      'PENDING',
    ];
    return this.pgService.query<DcuWithLoadWarning>(
      RAW_QUERIES.sql.supabase.dcuSnapshot1Min.getDcusWithLoadWarning,
      params,
    );
  }
}
