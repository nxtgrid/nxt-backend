import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import moment from 'moment';
import { VictronService } from '@core/modules/victron/victron.service';
import { IssueTypeEnum, UpdateGrid } from '@core/types/supabase-types';
import { SupabaseService } from '@core/modules/supabase.module';
import { VictronDiagnostic } from '@core/modules/victron/victron.types';

import { Issue } from '@core/modules/issues/entities/issue.entity';

const VICTRON_DIAGNOSTICS_FOR_GRID_CONFIG = [
  'PC', // number of phases supported
  // 'ca',  // battery capacity -> removed it for now, since it's not retrievable from vrm api
];

const VICTRON_DIAGNOSTICS_FOR_ISSUES: { [prop: string]: IssueTypeEnum } = {
  // { [Victron code]: 'Issue Type Enum' }
  'S': 'VEBUS_STATE',
  'ERR': 'VEBUS_ERROR',
  'eT' : 'QUATTRO_TEMPERATURE_ALARM',
  'eO' : 'QUATTRO_OVERLOAD_ALARM',
  'AHT': 'HIGH_BATTERY_TEMPERATURE_ALARM',
  'ACI': 'CELL_IMBALANCE_ALARM',
  'AHC': 'HIGH_CHARGE_CURRENT_ALARM',
  'AHCT': 'HIGH_CHARGE_TEMPERATURE_ALARM',
  'AIE': 'BATTERY_INTERNAL_FAILURE',
  'Abc': 'BATTERY_CHARGE_BLOCKED_ALARM',
  'Abd': 'BATTERY_DISCHARGE_BLOCKED_ALARM',
};

@Injectable()
export class GridDiagnosticsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly victronService: VictronService,
  ) { }

  private async updateGridByDiagnostics(
    grid: { id: number; is_three_phase_supported: boolean; },
    diagnostics: VictronDiagnostic[],
  ) {
    let toUpdate: UpdateGrid;

    for (const victronCode of VICTRON_DIAGNOSTICS_FOR_GRID_CONFIG) {
      const diagnostic = diagnostics.find(({ code }) => code === victronCode);
      if (!diagnostic) continue;

      // Update number of phases if diff
      if (victronCode === 'PC') {
        const existingThreePhaseValue = grid.is_three_phase_supported;
        const monitoredThreePhaseValue = diagnostic.rawValue !== 1;
        if(existingThreePhaseValue !== monitoredThreePhaseValue) {
          toUpdate = { ...toUpdate, is_three_phase_supported: monitoredThreePhaseValue };
        }
      }
    }

    if(!toUpdate) return;

    await this.supabaseService.adminClient
      .from('grids')
      .update(toUpdate)
      .eq('id', grid.id)
    ;
  }

  // This is currently not used, needs refactoring if re-implemented
  private async upsertIssuesByDiagnostics(grid_id: number, diagnostics: VictronDiagnostic[]) {
    const issuesToCreate = [];
    const issuesToUpdate = [];

    const openIssuesForThisGrid: Issue[] = [];
    // await this.issuesService.findMpptIssuesByGridIdAndIssueStatus(grid_id, 'OPEN');
    // findMpptIssuesByGridIdAndIssueStatus(gridId: number, issueStatus: IssueStatusEnum) {
    //   const queryBuilder = this.issueRepository.createQueryBuilder('issues');
    //   return queryBuilder
    //     .leftJoinAndSelect('issues.mppt', 'mppt')
    //     .leftJoinAndSelect('mppt.grid', 'grid')
    //     .where('grid.id = :grid_id', { grid_id: gridId })
    //     .andWhere('issues.issue_status = :issue_status', { issue_status: issueStatus })
    //     .orderBy('issues.started_at', 'ASC')
    //     .getMany();
    // }

    // we iterate throught the key valye pairs established at the top
    // and for each we run a check
    for (const [ key, value ] of Object.entries(VICTRON_DIAGNOSTICS_FOR_ISSUES)) {
      const diagnostic = diagnostics.find(({ code }) => code === key);

      // no corresponding diagnostics measure found, so skip
      if (!diagnostic) continue;

      const issueToCreate = {
        grid_id,
        issue_type: value,
        issue_status: 'OPEN',
      };

      // Among the open issues found for the grid, check if we can find an issue that's already about this problem
      const openIssueAlreadyForThisProblem: Issue = openIssuesForThisGrid.find(({ issue_type }) => issue_type === value);
      let issueToClose;

      if (openIssueAlreadyForThisProblem) {
        issueToClose = {
          id:openIssueAlreadyForThisProblem.id,
          issue_type: value,
          issue_status: 'CLOSED',
          closed_at: moment().toDate(),
        };
      }

      if (value === 'VEBUS_STATE') {
        if (diagnostic.formattedValue !== 'Inverting' &&
                diagnostic.formattedValue !== 'Off' &&
                diagnostic.formattedValue !== 'Absorption'
        ) {
          issuesToCreate.push(issueToCreate);
        }
        else {
          if (openIssueAlreadyForThisProblem) {
            issuesToUpdate.push(issueToClose);
          }
        }
      }
      else if (value === 'VEBUS_ERROR') {
        if (diagnostic.formattedValue !== 'No error') {
          issuesToCreate.push(issueToCreate);
        }
        else {
          if (openIssueAlreadyForThisProblem) {
            issuesToUpdate.push(issueToClose);
          }
        }
      }
      else if (value === 'QUATTRO_TEMPERATURE_ALARM') {
        if (diagnostic.formattedValue !== 'Ok') {
          issuesToCreate.push(issueToCreate);
        }
        else {
          if (openIssueAlreadyForThisProblem) {
            issuesToUpdate.push(issueToClose);
          }
        }
      }
      else if (value === 'QUATTRO_OVERLOAD_ALARM') {
        if (diagnostic.formattedValue !== 'Ok') {
          issuesToCreate.push(issueToCreate);
        }
        else {
          if (openIssueAlreadyForThisProblem) {
            issuesToUpdate.push(issueToClose);
          }
        }
      }
      else if (value === 'HIGH_BATTERY_TEMPERATURE_ALARM') {
        if (diagnostic.formattedValue !== 'No alarm') {
          issuesToCreate.push(issueToCreate);
        }
        else {
          if (openIssueAlreadyForThisProblem) {
            issuesToUpdate.push(issueToClose);
          }
        }
      }
      else if (value === 'CELL_IMBALANCE_ALARM') {
        if (diagnostic.formattedValue !== 'No alarm') {
          issuesToCreate.push(issueToCreate);
        }
        else {
          if (openIssueAlreadyForThisProblem) {
            issuesToUpdate.push(issueToClose);
          }
        }
      }
      else if (value === 'HIGH_CHARGE_CURRENT_ALARM') {
        if (diagnostic.formattedValue !== 'No alarm') {
          issuesToCreate.push(issueToCreate);
        }
        else {
          if (openIssueAlreadyForThisProblem) {
            issuesToUpdate.push(issueToClose);
          }
        }
      }
      else if (value === 'BATTERY_INTERNAL_FAILURE') {
        if (diagnostic.formattedValue !== 'No alarm') {
          issuesToCreate.push(issueToCreate);
        }
        else {
          if (openIssueAlreadyForThisProblem) {
            issuesToUpdate.push(issueToClose);
          }
        }
      }
      else if (value === 'BATTERY_CHARGE_BLOCKED_ALARM') {
        if (diagnostic.formattedValue !== 'Charge not blocked') {
          issuesToCreate.push(issueToCreate);
        }
        else {
          if (openIssueAlreadyForThisProblem) {
            issuesToUpdate.push(issueToClose);
          }
        }
      }
      else if (value === 'BATTERY_DISCHARGE_BLOCKED_ALARM') {
        if (diagnostic.formattedValue !== 'Discharge not blocked') {
          issuesToCreate.push(issueToCreate);
        }
        else {
          if (openIssueAlreadyForThisProblem) {
            issuesToUpdate.push(issueToClose);
          }
        }
      }
    }

    // create issues in tiamat
    // if (issuesToCreate.length > 0) {
    // console.info('would create some grid level issues via diagnostics, please uncomment to see them');
    // console.info(issuesToCreate);
    // await (this.httpService
    //   .post(`${ process.env.TIAMAT_API }/issues`, issuesToUpdate))
    //   .then(({ data }) => data);
    // }

    // if (issuesToUpdate.length > 0) {
    // console.info('would create some mppt level issues via diagnostics, please uncomment to see them');
    // console.info(issuesToUpdate);
    // await (this.httpService
    //   .put(`${ process.env.TIAMAT_API }/issues`, issuesToUpdate))
    //   .then(({ data }) => data);
    // }
  }

  /**
   * Scheduled diagnostics check every 15 minutes
  **/
  isRunningDiagnosticsMonitor = false;

  @Cron('*/15 * * * *', { disabled: process.env.NXT_ENV !== 'production' })
  async monitorDiagnotics() {
    if (this.isRunningDiagnosticsMonitor) return;
    this.isRunningDiagnosticsMonitor = true;

    const { adminClient: supabase, handleResponse } = this.supabaseService;

    try {
      const grids = await supabase
        .from('grids')
        .select('id, generation_external_site_id, is_three_phase_supported')
        .is('deleted_at', null)
        .eq('generation_external_system', 'VICTRON')
        .eq('is_automatic_energy_generation_data_sync_enabled', true)
        .not('generation_external_site_id', 'is', null)
        .then(handleResponse)
      ;

      for (const grid of grids) {
        try {
          const diagnostics = await this.victronService.fetchDiagnostics(grid.generation_external_site_id);

          await this.updateGridByDiagnostics(grid, diagnostics);
          // await this.upsertIssuesByDiagnostics(grid.id, diagnostics);
        }
        catch (err) {
          console.error(err);
        }
      }
    }
    catch (err) {
      console.error(err);
    }
    finally {
      this.isRunningDiagnosticsMonitor = false;
    }
  }
}
