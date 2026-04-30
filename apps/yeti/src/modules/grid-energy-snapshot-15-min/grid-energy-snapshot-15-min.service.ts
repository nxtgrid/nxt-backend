import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import moment from 'moment';
import { GridEnergySnapshot15Min } from '@timeseries/entities/grid-energy-snapshot-15-min.entity';
import { VictronService } from '@core/modules/victron/victron.service';
import { SupabaseService } from '@core/modules/supabase.module';
import { VictronStatsDatapoint } from '@core/modules/victron/victron.types';
import { chunkifyArray } from '@helpers/array-helpers';
import { RAW_QUERIES, GridMaxMcc, GridMaxMccParams } from '@yeti/queries';
import { clone } from 'ramda';

const VICTRON_MEASUREMENTS_TO_REQUEST = {
  // { [Victron code]: 'NXT name' }
  'a1': 'grid_l1_power_consumption_total_a1_w',
  'a2': 'grid_l2_power_consumption_total_a2_w',
  'a3': 'grid_l3_power_consumption_total_a3_w',
  'total_consumption': 'grid_consumption_total_kwh',
  'bs': 'battery_soc_bs_pct',
  'bc': 'battery_current_bc_a',
  'bv': 'battery_voltage_bv_v',
  'bst': 'battery_charging_state_bst_enum',
  'mcc': 'battery_charge_current_limit_mcc_a',
  'Pdc': 'pv_power_dc_pdc_w',
  'Pb': 'pv_energy_to_battery_pb_kwh',
  'Pc': 'pv_energy_to_grid_pc_kwh',
  'o1': 'grid_l1_power_consumption_output_o1_w',
  'o2': 'grid_l2_power_consumption_output_o2_w',
  'o3': 'grid_l3_power_consumption_output_o3_w',
  'I': 'battery_current_i_a',
  'McT': 'battery_min_cell_temp_mct_c',
  'BT': 'battery_temperature_bt_c',
  'mof': 'modules_off',
  'mon': 'modules_on',
  'ca': 'battery_capacity_ca_ah',
};
@Injectable()
export class GridEnergySnapshot15MinService {

  isVictronDataUpdateRunning = false;
  isGridSnapshotRunning = false;

  constructor(
    @InjectDataSource('timescale')
    protected readonly timescale: DataSource,
    protected readonly httpService: HttpService,
    protected readonly victronService: VictronService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR, { disabled: process.env.NXT_ENV !== 'production' })
  async fetchFromVictron() {
    if (this.isVictronDataUpdateRunning) return;
    this.isVictronDataUpdateRunning = true;

    try {
      const { adminClient: supabase, handleResponse } = this.supabaseService;
      const grids = await supabase
        .from('grids')
        .select(`
          id,
          name,
          generation_external_site_id,
          is_hps_on_threshold_kw,
          organization:organizations(
            id,
            name
          )
        `)
        .is('deleted_at', null)
        .eq('generation_external_system', 'VICTRON')
        .eq('is_automatic_energy_generation_data_sync_enabled', true)
        .not('generation_external_site_id', 'is', null)
        .gt('is_hps_on_threshold_kw', 0)
        .then(handleResponse)
      ;

      const now = moment();
      const end = moment().minute(0).second(0).millisecond(0);
      const start = moment(end).subtract(7, 'days');

      // Find the max mcc in the last month
      const oneMonthAgo = moment(now).subtract(1, 'month');
      const gridsMccMaxArray = await this.getGridsMaxMcc(oneMonthAgo, now);

      for (const grid of grids) {
        const statsData = await this.victronService.fetchInstallationAggregateStats(
          grid.generation_external_site_id,
          VICTRON_MEASUREMENTS_TO_REQUEST,
          { interval: '15mins', type: 'custom', start, end },
        );
        const maxMcc = gridsMccMaxArray.find(({ grid_id }) => grid_id === grid.id)?.battery_charge_current_limit_mcc_a;

        const statsToProcess = statsData.map(stats => ({
          grid,
          stats,
          maxMcc,
        }));
        const statsDataWithAppendedCalcs: GridEnergySnapshot15Min[] = statsToProcess.map(this.appendProps);

        // Break the array into chunks
        const chunks = chunkifyArray(statsDataWithAppendedCalcs, 1000);
        for (const chunk of chunks) {
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

  private insertIntoTimescale(chunk: GridEnergySnapshot15Min[]) {
    const query = this.timescale.createQueryBuilder()
      .insert()
      .into(GridEnergySnapshot15Min)
      .values(chunk)
      .orUpdate(
        // @TOMMASO :: Is this the same as the values of VICTRON_MEASUREMENTS_TO_REQUEST
        // plus is_curtailing and is_hps_on?
        [
          'grid_l1_power_consumption_total_a1_w',
          'grid_l2_power_consumption_total_a2_w',
          'grid_l3_power_consumption_total_a3_w',
          'battery_current_bc_a',
          'battery_charging_state_bst_enum',
          'battery_soc_bs_pct',
          'battery_voltage_bv_v',
          'grid_consumption_total_kwh',
          'is_hps_on',
          'battery_charge_current_limit_mcc_a',
          'pv_power_dc_pdc_w',
          'pv_energy_to_battery_pb_kwh',
          'pv_energy_to_grid_pc_kwh',
          'grid_l1_power_consumption_output_o1_w',
          'grid_l2_power_consumption_output_o2_w',
          'grid_l3_power_consumption_output_o3_w',
          'battery_current_i_a',
          'is_curtailing',
          'battery_min_cell_temp_mct_c',
          'battery_temperature_bt_c',
          'battery_capacity_ca_ah',
        ],
        [ 'created_at', 'grid_id' ],
      );

    return query.execute();
  }

  private appendProps({ grid, stats, maxMcc }: {
    grid: any;
    stats: VictronStatsDatapoint<typeof VICTRON_MEASUREMENTS_TO_REQUEST>;
    maxMcc: number;
  }): GridEnergySnapshot15Min {
    const statsDeepCopy: GridEnergySnapshot15Min = clone(stats);

    statsDeepCopy.grid_id = grid.id;
    statsDeepCopy.grid_name = grid.name;
    statsDeepCopy.organization_id = grid.organization?.id;
    statsDeepCopy.organization_name = grid.organization?.name;

    // a1, a2, a3 are all in W
    let aTotal = null;
    if (typeof stats.grid_l1_power_consumption_total_a1_w === 'number') {
      statsDeepCopy.grid_l1_power_consumption_total_a1_w = stats.grid_l1_power_consumption_total_a1_w / 1000;
      aTotal += stats.grid_l1_power_consumption_total_a1_w;
    }

    if (typeof stats.grid_l2_power_consumption_total_a2_w === 'number') {
      statsDeepCopy.grid_l2_power_consumption_total_a2_w = stats.grid_l2_power_consumption_total_a2_w / 1000;
      aTotal += stats.grid_l2_power_consumption_total_a2_w;
    }

    if (typeof stats.grid_l3_power_consumption_total_a3_w === 'number') {
      statsDeepCopy.grid_l3_power_consumption_total_a3_w = stats.grid_l3_power_consumption_total_a3_w / 1000;
      aTotal += stats.grid_l3_power_consumption_total_a3_w;
    }

    if (typeof stats.grid_l1_power_consumption_output_o1_w === 'number') {
      statsDeepCopy.grid_l1_power_consumption_output_o1_w = stats.grid_l1_power_consumption_output_o1_w / 1000;
    }

    if (typeof stats.grid_l2_power_consumption_output_o2_w === 'number') {
      statsDeepCopy.grid_l2_power_consumption_output_o2_w = stats.grid_l2_power_consumption_output_o2_w / 1000;
    }

    if (typeof stats.grid_l3_power_consumption_output_o3_w === 'number') {
      statsDeepCopy.grid_l3_power_consumption_output_o3_w = stats.grid_l3_power_consumption_output_o3_w / 1000;
    }

    // Determine is_hps_on
    statsDeepCopy.is_hps_on = (typeof aTotal === 'number' && typeof grid.is_hps_on_threshold_kw == 'number') ?
      aTotal >= grid.is_hps_on_threshold_kw :
      null;

    // Determine curtailment
    if (typeof stats.battery_current_i_a === 'number' &&
      typeof stats.battery_charge_current_limit_mcc_a === 'number' &&
      typeof stats.battery_soc_bs_pct === 'number') {

      if (stats.battery_soc_bs_pct < 90)
        statsDeepCopy.is_curtailing = false;
      else {
        if (typeof maxMcc === 'number') {
          if (stats.battery_charge_current_limit_mcc_a <= 100)
            statsDeepCopy.is_curtailing = true;
          else {
            statsDeepCopy.is_curtailing = stats.battery_charge_current_limit_mcc_a <
                      maxMcc ? stats.battery_current_i_a > 0.7 * stats.battery_charge_current_limit_mcc_a :
              stats.battery_current_i_a >= -60;
          }
        }
        else
          statsDeepCopy.is_curtailing = null;
      }
    }
    else
      statsDeepCopy.is_curtailing = null;

    return statsDeepCopy;
  }

  private async getGridsMaxMcc(start: moment.Moment, end: moment.Moment): Promise<GridMaxMcc[]> {
    const params: GridMaxMccParams = [
      start.format('YYYY-MM-DD HH:mm:ss'),
      end.format('YYYY-MM-DD HH:mm:ss'),
    ];

    return this.timescale.query(
      RAW_QUERIES.sql.timescale.gridEnergySnapshot15Min.findMaxMccByDateRange,
      params,
    );
  }

  @Cron('*/15 * * * *', { disabled: process.env.NXT_ENV !== 'production' })
  async snapshotFSStatus(): Promise<void> {
    if (this.isGridSnapshotRunning) return;
    this.isGridSnapshotRunning = true;

    try {
      const { adminClient: supabase, handleResponse } = this.supabaseService;
      const grids = await supabase
        .from('grids')
        .select(`id,
          name,
          generation_external_site_id,
          generation_external_system,
          is_fs_on,
          should_fs_be_on,
          is_automatic_energy_generation_data_sync_enabled,
          organization:organizations(id, name)`)
        .is('deleted_at', null)
        .eq('generation_external_system', 'VICTRON')
        .eq('is_automatic_energy_generation_data_sync_enabled', true)
        .then(handleResponse);

      // TODO: in the future we will probably have to find another way to filter out grids that are not running
      // using victron, but for the time being it's good enough
      const gridData: GridEnergySnapshot15Min[] = [];
      const createdAt = moment().second(0).millisecond(0).toDate();
      for (const grid of grids) {
        gridData.push({
          created_at: createdAt,
          is_fs_active: grid.is_fs_on,
          should_fs_be_on: grid.should_fs_be_on,
          grid_id: grid.id,
          grid_name: grid.name,
          organization_name: grid?.organization?.name,
          organization_id: grid?.organization?.id,
        });
      }

      await this.timescale
        .createQueryBuilder()
        .insert()
        .into(GridEnergySnapshot15Min)
        .values(gridData)
        .orUpdate([
          'is_fs_active',
          'should_fs_be_on',
        ], [ 'created_at', 'grid_id' ])
        .execute();
    }
    catch (err) {
      console.error(err);
    }
    finally {
      this.isGridSnapshotRunning = false;
    }
  }
}
