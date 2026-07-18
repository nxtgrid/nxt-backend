import { forwardRef, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {  Repository } from 'typeorm';
import { pluckIdsFrom } from '@helpers/array-helpers';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';
import { partition, pick } from 'ramda';

import { Issue } from '@core/modules/issues/entities/issue.entity';
import { MetersService } from '@tiamat/modules/meters/meters.service';
import { IssuesService as CoreIssuesService } from '@core/modules/issues/issues.service';
import { CreateIssueInput } from '@core/modules/issues/dto/create-issue.input';
import { Meter } from '@core/modules/meters/entities/meter.entity';
import { UpdateIssueInput } from '@core/modules/issues/dto/update-issue.input';
import { JiraService } from '../jira/jira.service';
import { UpdateMeterInput } from '@core/modules/meters/dto/update-meter.input';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ISSUE_PRIORITIES_MAP } from './constants/issue-config-map';

// TODO: getting scoping problems, so for now I am moving this variable to global
const HOURS_DELAY_FOR_UNEXPECTED_STATUSES_CHECK = 6;
@Injectable()
export class IssuesService extends CoreIssuesService implements OnModuleInit {
  isRunningMeterCheck = false;
  debuggingMeterExternalReference;

  constructor(
    @InjectRepository(Issue)
    protected readonly issueRepository: Repository<Issue>,
    @Inject(forwardRef(() => MetersService))
    private readonly meterService: MetersService,
    @Inject(forwardRef(() => JiraService))
    protected readonly jiraService: JiraService,
  ) {
    super(issueRepository);
  }

  onModuleInit() {
    if (process.env.NXT_ENV === 'production') {
      this.runMeterIssueCheck();
    }
  }

  async create(createIssueInput: CreateIssueInput[]) {
    const { identifiers } = await this.issueRepository.insert(createIssueInput);
    return this.findByIds(pluckIdsFrom(identifiers));
  }

  async upsert(createIssueInput: CreateIssueInput[]) {
    const issues: Issue[] = await this.issueRepository.save(createIssueInput);
    return this.findByIds(pluckIdsFrom(issues));
  }

  async update(id: number, updateIssueInput: UpdateIssueInput) {
    await this.issueRepository.update(id, updateIssueInput);
    return this.findOne(id);
  }

  async updateMany(updateIssueInput: UpdateIssueInput[]) {
    for (const updateItem of updateIssueInput) {
      await this.update(updateItem.id, updateItem);
    }

    return this.findByIds(pluckIdsFrom(updateIssueInput));
  }

  /*
  * The following section is about calculating the issues
  * to show in the issues page and to show in jira.
  */

  // issues need to be recalculated:
  // every time a directive result is read -> this is going to help with topups (credit/communication)
  // every time a consumption result is read  -> consumption
  // every time there is a read error result

  // this needs to run on cron because it's the only way we can check for unresponsiveness of meters,
  // ie issue checking cannot be purely reactive
  @Cron(CronExpression.EVERY_5_MINUTES, { disabled: process.env.NXT_ENV !== 'production' })
  async runMeterIssueCheck() {
    if (this.isRunningMeterCheck) return;
    this.isRunningMeterCheck = true;

    try {
      const limit = 100;

      const lastCheckedAt: moment.Moment = moment().subtract(5, 'minutes');
      let metersToCheck: Meter[];
      do {
        const lockSession = uuidv4();
        metersToCheck = await this.meterService.lockNextMeterIssuePage(lockSession, lastCheckedAt, limit);

        if (metersToCheck.length < 1) return;

        await this.generateIssuesByMeters(metersToCheck);
      } while (metersToCheck.length > 0);
    }
    catch (err) {
      console.error('Error checking issues', err);
    }
    finally {
      this.isRunningMeterCheck = false;
    }
  }

  communicationFilter(meter: Meter) {
    // If the DCU is not online, then we don't even bother creating an issue, since it's a DCU problem then
    return meter.dcu?.is_online && (
      !meter.last_seen_at ||
      !moment(meter.last_seen_at).isValid() ||
      moment(meter.last_seen_at).isBefore(moment().subtract(meter.connection.customer.grid.meter_communication_issue_threshold_detection_days, 'days'))
    );
  }

  creditFilter(meter: Meter) {
    return typeof meter.kwh_credit_available != 'number' || meter.kwh_credit_available <= 0;
  }

  consumptionFilter(meter: Meter) {
    return !meter.last_non_zero_consumption_at ||
      !moment(meter.last_non_zero_consumption_at).isValid() ||
      moment(meter.last_non_zero_consumption_at).isBefore(moment().subtract(meter.connection.customer.grid.meter_communication_issue_threshold_detection_days, 'days'));
  }

  meterStateConfigurationFilter(meter: Meter) {
    return (
      !meter.connection.customer.grid.is_hps_on && //do not trigger it if the grid is not energised
      meter.kwh_credit_available > 0 &&
      (
        (
          meter.is_manual_mode_on && meter.is_on !== meter.should_be_on
        ) ||
        (
          meter.connection.customer.grid.should_fs_be_on != null &&
          moment(meter.connection.customer.grid.should_fs_be_on_updated_at).isBefore(moment().subtract(HOURS_DELAY_FOR_UNEXPECTED_STATUSES_CHECK, 'hours')) &&
          (
            meter.meter_type === 'FS' &&
            !meter.is_manual_mode_on &&
            meter.is_on !== meter.connection.customer.grid.should_fs_be_on
          )
        )
      )
    );
  }

  powerLimitConfigurationFilter(meter: Meter) {
    return (
      typeof meter.power_limit_should_be != 'number' && //if there is no power limit should be set, then we compare to the standard power limits
          (
            (meter.meter_type === 'HPS' && meter.power_limit !== 200) ||
            (meter.meter_type === 'FS' && meter.power_limit !== 0))
    ) ||
        (
          typeof meter.power_limit_should_be == 'number' &&
          meter.power_limit !== meter.power_limit_should_be //otherwise, we compare to what it should be
        );
  }

  meterNotActivatedFilter(meter: Meter) {
    return meter.current_special_status === 'METER_NOT_ACTIVATED';
  }

  tamperFilter(meter: Meter) {
    return meter.current_special_status === 'TAMPER';
  }

  powerLimitBreachedFilter(meter: Meter) {
    return meter.current_special_status === 'POWER_LIMIT_BREACHED';
  }

  overVoltageFilter(meter: Meter) {
    return meter.current_special_status === 'OVER_VOLTAGE';
  }

  lowVoltageFilter(meter: Meter) {
    return meter.current_special_status === 'LOW_VOLTAGE';
  }

  appendStartedAt(issue: Issue): Issue {
    let startedAt;
    if ('NO_CONSUMPTION' === issue.issue_type)
      startedAt = moment(issue.created_at).subtract(issue.meter.connection.customer.grid.meter_consumption_issue_threshold_detection_days, 'days').toDate();
    else if ('NO_COMMUNICATION' === issue.issue_type)
      startedAt = moment(issue.created_at).subtract(issue.meter.connection.customer.grid.meter_communication_issue_threshold_detection_days, 'days').toDate();
    else
      startedAt = moment(issue.created_at).subtract(HOURS_DELAY_FOR_UNEXPECTED_STATUSES_CHECK, 'hours').toDate();

    return {
      ...issue,
      started_at: startedAt,
    };
  }

  async generateIssuesByMeters(meters: Meter[]) {
    const issueFilterMap = {
      NO_COMMUNICATION: this.communicationFilter,
      METER_NOT_ACTIVATED: this.meterNotActivatedFilter, //only changes during via directive-driven flow
      TAMPER: this.tamperFilter, //only changes during via directive-driven flow
      POWER_LIMIT_BREACHED: this.powerLimitBreachedFilter, //only changes during via directive-driven flow
      OVER_VOLTAGE: this.overVoltageFilter, //only changes during via directive-driven flow
      LOW_VOLTAGE: this.lowVoltageFilter, //only changes during via directive-driven flow
      UNEXPECTED_POWER_LIMIT: this.powerLimitConfigurationFilter,
      UNEXPECTED_METER_STATUS: this.meterStateConfigurationFilter,
      NO_CREDIT : this.creditFilter,
      NO_CONSUMPTION : this.consumptionFilter,
    };

    // only process meters that have been installed correctly
    const metersToCheck: Meter[] = meters.filter(meter => meter.connection?.customer?.grid &&
      meter.last_metering_hardware_install_session?.last_meter_commissioning?.meter_commissioning_status === 'SUCCESSFUL');

    const { issues, remainder } = Object.keys(issueFilterMap).reduce((accObj, key) => {
      const [ filteredMeters, remainingMeters ] = partition(issueFilterMap[key], accObj.remainder);
      const issues = filteredMeters.map(meter => {
        return {
          meter,
          issue_status: 'OPEN',
          issue_type: key,
          created_at: new Date(),
        };
      });
      return { issues: [ ...accObj.issues, ...issues ], remainder: remainingMeters };

    }, { issues: [], remainder: metersToCheck });

    const issuesWithStartedAtAppended = issues.map(this.appendStartedAt);
    // for each newly generate issue, find out whether the corresponding meter already has an open issue of the same type.
    // if so, no need to add new issues, close or override anything. if the old issue is more important, then mark that issue as
    // closed, since the algo did not find it to exist anymore. if the old issue is less important, then mark that issue as
    // overridden, since a new one came up that's more important.

    // const [issuesWhereMeterDoesNotHavePreviousIssues, issuesWhoseMeterHasOldOpenIssuesOfDifferentTypeNeedingUpdate] = partition(issue => issue.meter.last_encountered_issue?.issue_status === IssueStatus.OPEN &&
    //   issue.meter.last_encountered_issue?.issue_type !== issue.issue_type, issues);
    // find all the old issues that are not of the same type and that are open
    const issuesWhoseMeterHasNoOpenIssues: Issue[] = issuesWithStartedAtAppended
      .filter(issue => {
        return !issue.meter.last_encountered_issue || issue.meter.last_encountered_issue.issue_status === 'CLOSED';
      });

    const issuesWhoseMeterHasOldOpenIssuesOfDifferentTypeNeedingUpdate: Issue[] = issuesWithStartedAtAppended
      .filter(issue => {
        return issue.meter.last_encountered_issue?.issue_status === 'OPEN' &&
        issue.meter.last_encountered_issue?.issue_type !== issue.issue_type;
      });

    // break the old issues array into two: more important to close and less important to override
    // const openIssues: Issue[] = issuesWhoseMeterHasOldOpenIssuesOfDifferentTypeNeedingUpdate.filter(issue => issue.meter.last_encountered_issue?.issue_status === IssueStatus.OPEN);
    const [ oldMoreOrEquallyImportantIssues, oldLessImportantIssues ] = partition(issue => ISSUE_PRIORITIES_MAP[issue.issue_type] <=  ISSUE_PRIORITIES_MAP[issue.meter.last_encountered_issue.issue_type], issuesWhoseMeterHasOldOpenIssuesOfDifferentTypeNeedingUpdate);

    // insert the final issues determined
    const insertedIssues = await this.upsert([ ...issuesWhoseMeterHasNoOpenIssues, ...issuesWhoseMeterHasOldOpenIssuesOfDifferentTypeNeedingUpdate ]);

    // we only want to report the issues that have problems that our technical (ie everything but sales)
    const technicalIssues: Issue[] = insertedIssues.filter(({ issue_type }) =>
      issue_type !== 'NO_CREDIT' &&
      issue_type !== 'NO_CONSUMPTION',
    );

    if (technicalIssues.length > 0) {
      const createdJiraIssues: Issue[] = await this.jiraService.createMany(technicalIssues);
      await this.updateMany(createdJiraIssues.map(pick([ 'id', 'external_reference' ])));
    }

    // close issues that are still open for meters where no new issue was found
    const issuesToBeClosed: UpdateIssueInput[] = remainder
      .filter(meter => {
        return meter.last_encountered_issue &&
          meter.last_encountered_issue?.id &&
          meter.last_encountered_issue?.issue_status === 'OPEN';
      }) //only need the issues if they exist
      .map(({ last_encountered_issue }) => ({
        id: last_encountered_issue.id,
        issue_status: 'CLOSED',
        closed_at: new Date(),
      }));

    // @TOMMASO :: To discuss; why do we close more important issues?
    const oldMoreImportantIssuesToClose: UpdateIssueInput[] = oldMoreOrEquallyImportantIssues
      .map(newIssue => ({
        id: newIssue.meter.last_encountered_issue.id,
        issue_status: 'CLOSED',
        closed_at: new Date(),
      }));
    const oldLessImportantIssuesToOverride: UpdateIssueInput[] = oldLessImportantIssues
      .map(newIssue => ({
        id: newIssue.meter.last_encountered_issue.id,
        issue_status: 'OVERRIDDEN',
        closed_at: new Date(),
      }));

    const techIssuesToClose: UpdateIssueInput[] = [ ...issuesToBeClosed, ...oldMoreImportantIssuesToClose, ...oldLessImportantIssuesToOverride ];
    if (techIssuesToClose.length) {
      const issuesToComment: Issue[] = await this.findByIds(pluckIdsFrom(techIssuesToClose));
      await this.jiraService.commentMany(issuesToComment, 'This issue can be closed');
    }

    // mark old issues either as closed or as overridden
    await this.updateMany([ ...oldMoreImportantIssuesToClose,  ...oldLessImportantIssuesToOverride , ...issuesToBeClosed ]);

    //update the meters to point to the new issues
    const metersToUpdate: UpdateMeterInput[] = insertedIssues.map(issue => ({ id: issue.meter.id, last_encountered_issue: issue }));
    return this.meterService.updateMany(metersToUpdate);
  }

  setDebug(externalReference: string) {
    this.debuggingMeterExternalReference = externalReference;
  }
}
