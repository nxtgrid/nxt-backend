import moment from 'moment';
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { round, toSafeNumberOrNull, toSafeNumberOrZero } from '@helpers/number-helpers';
import { buildIssueCounts } from './lib/issue-counting';
import { RAW_QUERIES, MeterConsumptionByGridAndType, MeterConsumptionByGridAndTypeParams, GridDailyProduction, GridDailyProductionParams, GridDailyEstimatedProduction, GridDailyEstimatedProductionParams } from '@yeti/queries';

import { ConnectionsService } from '@core/modules/connections/connections.service';
import { CustomersService } from '@core/modules/customers/customers.service';
import { MetersService } from '@core/modules/meters/meters.service';
import { GridBusinessSnapshot1D } from '@timeseries/entities/grid-business-snapshot-1-d.entity';
import { SpendingService } from '@core/modules/spending/spending.service';
import { VictronService } from '@core/modules/victron/victron.service';
import { EnergyTrackingService } from '@core/modules/energy-tracking/energy-tracking.service';
import { SupabaseService } from '@core/modules/supabase.module';

const VICTRON_DIAGNOSTICS_TO_TRACK = [ 'mon', 'mof' ];

@Injectable()
export class GridBusinessSnapshot1DService {
  constructor(
    @InjectDataSource('timescale')
    protected readonly timescale: DataSource,
    private readonly supabaseService: SupabaseService,
    protected readonly spendingService: SpendingService,
    protected readonly connectionService: ConnectionsService,
    protected readonly customerService: CustomersService,
    protected readonly meterService: MetersService,
    protected readonly victronService: VictronService,
    protected readonly httpService: HttpService,
    protected readonly energyTrackingService: EnergyTrackingService,
  ) { }

  // We run it every day at 1 AM UTC, so all the data we have is from the previous day.
  isGridSnapshottingRunning = false;

  @Cron(CronExpression.EVERY_DAY_AT_1AM, { disabled: process.env.NXT_ENV !== 'production' })
  async upsertBusinessSnapshotsByGrid() {
    if (this.isGridSnapshottingRunning) return;
    this.isGridSnapshottingRunning = true;

    try {
      const { adminClient: supabase, handleResponse } = this.supabaseService;

      const gridSnapshotsToInsert: GridBusinessSnapshot1D[] = [];

      // Keep this here to be able to recover data easily from the past
      // const end = moment('2023-10-02 00:00:00');
      const end = moment().startOf('day');
      const start = end.clone().subtract(1, 'day');
      const monthDays = start.daysInMonth();

      // Fetch count data for all grids (all of these already take into account whether reporting is hidden)
      const [
        allCustomerCounts,
        allResidentialConnectionCounts,
        allCommercialConnectionCounts,
        allPublicConnectionCounts,
        alllifelineConnectionCounts,
        allMeterCounts,
        allMeterGroupsByPhase,
        allMeterGroupsByIssue,
      ] = await Promise.all([
        // @TOMMASO :: I have a feeling that these could be more efficient somehow?
        this.customerService.findByHiddenFromReportingGroupByGridId(false),
        this.connectionService.findResidentialGroupedByProductionAndIsHiddenFromReporting(false),
        this.connectionService.findCommercialGroupedByProductionAndIsHiddenFromReporting(false),
        this.connectionService.findPublicGroupedByProductionAndIsHiddenFromReporting(false),
        this.connectionService.findLifelineConnectionsGroupedByProductionAndIsHiddenFromReporting(false),
        this.meterService.findGroupedByGridAndFilterByIsHiddenFromReporting(false),
        this.meterService.findGroupedByMeterPhaseIsHiddenFromReporting(false),
        this.meterService.findGroupedMetersByLastEncounteredIssueType(false, 'OPEN'),
      ]);

      const grids = await supabase
        .from('grids')
        .select(`
          id,
          kwh_tariff_essential_service,
          kwh_tariff_full_service,
          kwh,
          kwp,
          monthly_rental,
          default_hps_connection_fee,
          default_fs_1_phase_connection_fee,
          default_fs_3_phase_connection_fee,
          name,
          organization:organizations(
            id,
            name
          )
        `)
        .eq('is_hidden_from_reporting', false)
        .then(handleResponse)
      ;

      for (const grid of grids) {
        try {
          const customerCountForGrid = allCustomerCounts.find(({ grid_id }) => grid_id === grid.id);
          const meterCountsForGrid = allMeterCounts.filter(({ grid_id }) => grid_id === grid.id);
          const meterGroupsByPhaseForGrid = allMeterGroupsByPhase.filter(({ grid_id }) => grid_id === grid.id);
          const meterGroupsByIssueForGrid = allMeterGroupsByIssue.filter(({ grid_id }) => grid_id === grid.id);
          const commercialCountForGrid = allCommercialConnectionCounts.find(({ grid_id }) => grid_id === grid.id);
          const residentialCountForGrind = allResidentialConnectionCounts.find(({ grid_id }) => grid_id === grid.id);
          const publicCountForGrid = allPublicConnectionCounts.find(({ grid_id }) => grid_id === grid.id);
          const lifelineCountForGrind = alllifelineConnectionCounts.find(({ grid_id }) => grid_id === grid.id);

          const hpsCountFromDb = meterCountsForGrid.find(({ meter_type }) => meter_type === 'HPS');
          const fsCountFromDb = meterCountsForGrid.find(({ meter_type }) => meter_type === 'FS');
          const threePhaseMeterCountFromDb = meterGroupsByPhaseForGrid.find(({ meter_phase }) => meter_phase === 'THREE_PHASE');
          const singlePhaseMeterCountFromDb = meterGroupsByPhaseForGrid.find(({ meter_phase }) => meter_phase === 'SINGLE_PHASE');

          const customer_count = toSafeNumberOrZero(customerCountForGrid?.count);
          const hps_meter_count = toSafeNumberOrZero(hpsCountFromDb?.count);
          const fs_meter_count = toSafeNumberOrZero(fsCountFromDb?.count);
          const single_phase_meter_count = toSafeNumberOrZero(singlePhaseMeterCountFromDb?.count);
          const three_phase_meter_count = toSafeNumberOrZero(threePhaseMeterCountFromDb?.count);

          const issueCounts = buildIssueCounts(meterGroupsByIssueForGrid);
          const total_issue_count = Object.values(issueCounts).reduce((sum, count) => sum + count, 0);
          const {
            no_communication_issue_count,
            no_credit_issue_count,
            no_consumption_issue_count,
            not_activated_issue_count,
            tamper_issue_count,
            power_limit_breached_issue_count,
            over_voltage_issue_count,
            low_voltage_issue_count,
            unexpected_power_limit_issue_count,
            unexpected_meter_status_issue_count,
          } = issueCounts;

          const residential_connection_count = toSafeNumberOrZero(residentialCountForGrind?.count);
          const commercial_connection_count = toSafeNumberOrZero(commercialCountForGrid?.count);
          const public_connection_count = toSafeNumberOrZero(publicCountForGrid?.count);
          const lifeline_connection_count = toSafeNumberOrZero(lifelineCountForGrind?.count);

          const _residentialWomenImpactedCount = toSafeNumberOrZero(residentialCountForGrind?.women_impacted_count);
          const _commercialWomenImpactedCount = toSafeNumberOrZero(commercialCountForGrid?.women_impacted_count);
          const _publicWomenImpactedCount = toSafeNumberOrZero(publicCountForGrid?.women_impacted_count);

          const total_connection_count = residential_connection_count + commercial_connection_count + public_connection_count;
          const women_impacted_count = _residentialWomenImpactedCount + _commercialWomenImpactedCount + _publicWomenImpactedCount;

          // @TOMMASO :: Why is this comment here?
          // todo: move this out of the loop
          const energy_topup_revenue = await this.spendingService.findEnergyTopupRevenue(grid.id, { start, end });
          const connection_fee_revenue = await this.spendingService.findConnectionFeeRevenue(grid.id, { start, end }); // Could be cominged in Promise.all

          gridSnapshotsToInsert.push({
            created_at: start.toDate(),
            grid_id: grid.id,
            organization_id: grid?.organization?.id,
            hps_tariff: grid.kwh_tariff_essential_service,
            fs_tariff: grid.kwh_tariff_full_service,
            kwh: grid.kwh,
            kwp: grid.kwp,
            grid_name: grid.name,
            organization_name: grid?.organization?.name,
            energy_topup_revenue,
            connection_fee_revenue,
            monthly_rental: grid.monthly_rental,
            residential_connection_count,
            commercial_connection_count,
            total_connection_count,
            women_impacted_count,
            customer_count,
            daily_rental: round(grid.monthly_rental / monthDays, 2),
            public_connection_count,
            hps_meter_count,
            fs_meter_count,
            total_meter_count: hps_meter_count + fs_meter_count,
            no_communication_issue_count,
            no_credit_issue_count,
            no_consumption_issue_count,
            total_issue_count,
            hps_single_phase_connection_fee: grid.default_hps_connection_fee,
            fs_single_phase_connection_fee: grid.default_fs_1_phase_connection_fee,
            fs_three_phase_connection_fee: grid.default_fs_3_phase_connection_fee,
            not_activated_issue_count,
            tamper_issue_count,
            power_limit_breached_issue_count,
            over_voltage_issue_count,
            low_voltage_issue_count,
            unexpected_power_limit_issue_count,
            unexpected_meter_status_issue_count,
            lifeline_connection_count,
            single_phase_meter_count,
            three_phase_meter_count,
          });
        }
        catch(err) {
          console.error(`[GRID BUSINESS SNAPSHOT 1D] Error creating snapshot for ${ grid.name }`, err);
        }
      }

      await this.timescale
        .createQueryBuilder()
        .insert()
        .into(GridBusinessSnapshot1D)
        .values(gridSnapshotsToInsert)
        .orUpdate([
          'organization_id',
          'hps_tariff',
          'fs_tariff',
          'kwh',
          'kwp',
          'grid_name',
          'organization_name',
          'energy_topup_revenue',
          'connection_fee_revenue',
          'monthly_rental',
          'residential_connection_count',
          'commercial_connection_count',
          'total_connection_count',
          'women_impacted_count',
          'customer_count',
          'daily_rental',
          'public_connection_count',
          'hps_meter_count',
          'fs_meter_count',
          'total_meter_count',
          'no_communication_issue_count',
          'no_credit_issue_count',
          'no_consumption_issue_count',
          'total_issue_count',
          'hps_single_phase_connection_fee',
          'fs_single_phase_connection_fee',
          'fs_three_phase_connection_fee',
          'not_activated_issue_count',
          'tamper_issue_count',
          'power_limit_breached_issue_count',
          'over_voltage_issue_count',
          'low_voltage_issue_count',
          'unexpected_power_limit_issue_count',
          'unexpected_meter_status_issue_count',
          'lifeline_connection_count',
          'single_phase_meter_count',
          'three_phase_meter_count',
        ],
        [ 'created_at', 'grid_id' ],
        )
        .execute()
      ;
    }
    catch (err) {
      console.error('[GRID BUSINESS SNAPSHOT 1D] General error', err);
    }
    finally {
      this.isGridSnapshottingRunning = false;
    }
  }

  // This needs to run on a different Cronjob because meter data is only available starting from two days ago
  isMeterConsumptionSnapshottingRunning = false;

  @Cron(CronExpression.EVERY_DAY_AT_2AM, { disabled: process.env.NXT_ENV !== 'production' })
  async upsertBusinessSnapshotsByMeterConsumption() {
    if (this.isMeterConsumptionSnapshottingRunning) return;
    this.isMeterConsumptionSnapshottingRunning = true;

    try {
      const { adminClient: supabase, handleResponse } = this.supabaseService;

      const grids = await supabase
        .from('grids')
        .select('id, name, organization:organizations(id, name)')
        .eq('is_hidden_from_reporting', false)
        .then(handleResponse)
      ;

      // We have to go back a five days to make sure all data is downloaded from Calin
      const fiveDaysAgoStart = moment().subtract(5, 'days').startOf('day');
      const fiveDaysAgoEnd = fiveDaysAgoStart.clone().add(1, 'day');

      const [
        meterConsumptionForGrids,
        productionforGrids,
        estimatedActualsForGrids,
      ] = await Promise.all([
        this.getMeterConsumptionForGrids(fiveDaysAgoStart, fiveDaysAgoEnd),
        this.getProductionForGrids(fiveDaysAgoStart, fiveDaysAgoEnd),
        this.getEstimatedActualsForGrids(fiveDaysAgoStart, fiveDaysAgoEnd),
      ]);

      const gridSnapshotsToInsert: GridBusinessSnapshot1D[] = [];
      for (const grid of grids) {
        try {
          const meterConsumptionForGrid = meterConsumptionForGrids.filter(({ grid_id }) => grid_id === grid.id);
          const productionForGrid = productionforGrids.find(({ grid_id }) => grid_id === grid.id);
          const estimatedActualsForGrid = estimatedActualsForGrids.find(({ grid_id }) => grid_id === grid.id);
          const hpsConsumption = meterConsumptionForGrid.find(({ meter_type }) => meter_type === 'HPS');
          const fsConsumption = meterConsumptionForGrid.find(({ meter_type }) => meter_type === 'FS');

          const hps_consumption_kwh = toSafeNumberOrZero(hpsConsumption?.total);
          const fs_consumption_kwh = toSafeNumberOrZero(fsConsumption?.total);
          const total_mppt_production_kwh = toSafeNumberOrZero(productionForGrid?.kwh);
          const total_estimated_mppt_production_kwh = toSafeNumberOrZero(estimatedActualsForGrid?.kwh);

          const total_consumption_kwh = hps_consumption_kwh + fs_consumption_kwh;
          const cuf = total_estimated_mppt_production_kwh > 0 ? total_consumption_kwh / total_estimated_mppt_production_kwh : null;

          gridSnapshotsToInsert.push({
            created_at: fiveDaysAgoStart.toDate(),
            grid_id: grid.id,
            cuf,
            hps_consumption_kwh,
            fs_consumption_kwh,
            total_consumption_kwh,
            total_estimated_mppt_production_kwh,
            total_mppt_production_kwh,
          });
        }
        catch (err) {
          console.error(`[GRID BUSINESS SNAPSHOT 1D] Error creating snapshot for ${ grid.name }`, err);
        }
      }

      await this.timescale
        .createQueryBuilder()
        .insert()
        .into(GridBusinessSnapshot1D)
        .values(gridSnapshotsToInsert)
        .orUpdate([
          'cuf',
          'hps_consumption_kwh',
          'fs_consumption_kwh',
          'total_consumption_kwh',
          'total_estimated_mppt_production_kwh',
          'total_mppt_production_kwh',
        ],
        [ 'created_at', 'grid_id' ],
        )
        .execute();
    }
    catch (err) {
      console.error('[GRID BUSINESS SNAPSHOT 1D] General error', err);
    }
    finally {
      this.isMeterConsumptionSnapshottingRunning = false;
    }
  }


  /**
   * Scheduled process update every grid's kWh value based on the
   * number of batteries having been active over the last 30 days
  **/

  isGridsBatteryOnOffUpdateRunning = false;

  @Cron(CronExpression.EVERY_DAY_AT_3AM, { disabled: process.env.NXT_ENV !== 'production' })
  async updateGridsKwhByActiveBatteryModules() {
    if (this.isGridsBatteryOnOffUpdateRunning) return;
    this.isGridsBatteryOnOffUpdateRunning = true;

    try {
      const { adminClient: supabase, handleResponse } = this.supabaseService;

      const grids = await supabase
        .from('grids')
        .select('id, name, generation_external_site_id, kwh_per_battery_module, organization:organizations(id, name)')
        .is('deleted_at', null)
        .eq('is_hidden_from_reporting', false)
        .eq('generation_external_system', 'VICTRON')
        .not('generation_external_gateway_id', 'is', null)
        .then(handleResponse)
      ;

      const _gridBusinessDatapoints: GridBusinessSnapshot1D[] = [];
      const todayStartMoment = moment().startOf('day');

      /**
       * First we update the respective counts of battery modules that are ON and OFF
      **/
      for (const grid of grids) {
        console.info(`Fetching battery ON/OFF data for grid ${ grid.name } with installation ID ${ grid.generation_external_site_id }`);
        try {
          const diagnostics = await this.victronService.fetchDiagnostics(grid.generation_external_site_id);

          for (const victronCode of VICTRON_DIAGNOSTICS_TO_TRACK) {
            const diagnostic = diagnostics.find(({ code }) => code === victronCode);
            if (!diagnostic) continue;

            const safeValue = toSafeNumberOrNull(diagnostic.rawValue);
            if (safeValue !== null) {
              let _datapoint = _gridBusinessDatapoints.find(({ grid_id }) => grid_id === grid.id);
              if(!_datapoint) {
                _datapoint = {
                  created_at: todayStartMoment.toDate(),
                  grid_id: grid.id,
                };
                _gridBusinessDatapoints.push(_datapoint);
              }

              if(victronCode === 'mof') _datapoint.battery_modules_off_count = safeValue;
              if(victronCode === 'mon') _datapoint.battery_modules_on_count = safeValue;
            }
          }
        }
        catch (err) {
          console.error('[GRID BUSINESS SNAPSHOT 1D] Error fetching diagnostics', err);
        }
      }

      // console.info('[GRID BUSINESS SNAPSHOT 1D] Grid business datapoints', _gridBusinessDatapoints.length, JSON.stringify(_gridBusinessDatapoints));
      if (_gridBusinessDatapoints.length) {
        await this.timescale
          .createQueryBuilder()
          .insert()
          .into(GridBusinessSnapshot1D)
          .values(_gridBusinessDatapoints)
          .orUpdate(
            [ 'battery_modules_on_count', 'battery_modules_off_count' ],
            [ 'created_at', 'grid_id' ],
          )
          .execute();
      }

      /**
       * After updating the battery modules ON/OFF state,
       * we can determine te kWh capacity of the grid
      **/
      const thirtyDaysAgoMoment = todayStartMoment.clone().subtract(30, 'days');

      for (const grid of grids) {
        // @DETAIL :: Skip Ogbinbiri because it's running a different BMU
        if(grid.name === 'Ogbinbiri') continue;

        try {
          const batteryModulesSnapshots = await this.energyTrackingService
            .getActiveBatteryModules(grid.id, thirtyDaysAgoMoment, todayStartMoment);
          if(!batteryModulesSnapshots.length) continue;

          // Get the maximum number of batteries ever having been ON
          const onCounts = batteryModulesSnapshots.map(({ battery_modules_on_count }) => battery_modules_on_count ?? 0);
          const maxOnCount = Math.max(...onCounts);
          const totalKwh = round(maxOnCount * (grid.kwh_per_battery_module ?? 0), 2);

          console.info(`[GRID BUSINESS SNAPSHOT 1D] Updating ${ grid.name } to ${ totalKwh } kWh based on ${ maxOnCount } active batteries`);
          await supabase
            .from('grids')
            .update({ kwh: totalKwh })
            .eq('id', grid.id)
            .then(handleResponse)
          ;
        }
        catch(err) {
          console.error(`[GRID BUSINESS SNAPSHOT 1D] Error fetching/updating ${ grid.name } kWh by number of active batteries`, err);
        }
      }
    }
    catch (err) {
      console.error('[GRID BUSINESS SNAPSHOT 1D] General error', err);
    }
    finally {
      this.isGridsBatteryOnOffUpdateRunning = false;
    }
  }

  private async getMeterConsumptionForGrids(start: moment.Moment, end: moment.Moment): Promise<MeterConsumptionByGridAndType[]> {
    const params: MeterConsumptionByGridAndTypeParams = [
      start.format('YYYY-MM-DD HH:mm:ss'),
      end.format('YYYY-MM-DD HH:mm:ss'),
    ];
    return this.timescale.query(
      RAW_QUERIES.sql.timescale.gridBusinessSnapshot1D.findMeterConsumptionGrouped,
      params,
    );
  }

  private async getEstimatedActualsForGrids(start: moment.Moment, end: moment.Moment): Promise<GridDailyEstimatedProduction[]> {
    const params: GridDailyEstimatedProductionParams = [
      start.format('YYYY-MM-DD HH:mm:ss'),
      end.format('YYYY-MM-DD HH:mm:ss'),
    ];
    return this.timescale.query(
      RAW_QUERIES.sql.timescale.gridBusinessSnapshot1D.findEstimatedProductionGrouped,
      params,
    );
  }

  private async getProductionForGrids(start: moment.Moment, end: moment.Moment): Promise<GridDailyProduction[]> {
    const params: GridDailyProductionParams = [
      start.format('YYYY-MM-DD HH:mm:ss'),
      end.format('YYYY-MM-DD HH:mm:ss'),
    ];
    return this.timescale.query(
      RAW_QUERIES.sql.timescale.gridBusinessSnapshot1D.findProductionGrouped,
      params,
    );
  }
}
