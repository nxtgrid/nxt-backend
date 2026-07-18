import { Cron } from '@nestjs/schedule';
import { Injectable } from '@nestjs/common';
import { sortBy } from 'ramda';
import moment from 'moment';
import { SpendingService } from '@core/modules/spending/spending.service';
import { SupabaseService } from '@core/modules/supabase.module';
import { NotificationsService } from '../notifications/notifications.service';
import { PgService } from '@core/modules/core-pg';
import { formatCurrency, round, toSafeNumberOrZero } from '@helpers/number-helpers';
import { ExternalSystemEnum, IssueTypeEnum, NotificationTypeEnum } from '@core/types/supabase-types';

const ORGANIZATIONS_RECEIVING_REPORT = [ 'Solaviva', 'Zahra', 'Etinpower Limited', 'SAF-AGA' ];
const COMMERCIAL_ISSUE_TYPES: IssueTypeEnum[] = [ 'NO_CREDIT', 'NO_CONSUMPTION' ];

@Injectable()
export class RevenueUpdateService {
  constructor(
    private readonly pgService: PgService,
    private readonly supabaseService: SupabaseService,
    private readonly spendingService: SpendingService,
    private readonly notificationsService: NotificationsService,
  ) { }

  isEmailRevenueReportRunning = false;
  // Run every Tuesday at 10 AM
  @Cron('0 10 * * TUE', { disabled: process.env.NXT_ENV !== 'production' })
  async sendRevenueReports() {
    if (this.isEmailRevenueReportRunning) return;
    this.isEmailRevenueReportRunning = true;

    try {
      const organizations = await this.supabaseService.adminClient
        .from('organizations')
        .select('id')
        .is('deleted_at', null)
        .in('name', ORGANIZATIONS_RECEIVING_REPORT)
        .then(this.supabaseService.handleResponse)
      ;

      for(const { id } of organizations) {
        try {
          await this.generateAndProcessReport(id);
        }
        catch(err) {
          console.info(`[REVENUE REPORT] Error generating report for organization with ID ${ id }`, err);
        }
      }
    }
    catch (err) {
      console.error('[REVENUE REPORT] General error', err);
    }
    finally {
      this.isEmailRevenueReportRunning = false;
    }
  }

  private async generateAndProcessReport(organizationId: number) {
    const { adminClient: supabase, handleResponse } = this.supabaseService;

    // Calculate how much of the month has elapsed so far in minutes
    const nowMoment = moment();
    const minutesInMonth = nowMoment.daysInMonth() * 1440;
    const minutesSoFarThisMonth = nowMoment.date() * 1440 + nowMoment.hour() * 60 + nowMoment.minute();
    const percentageOfMonthElapsed = round((minutesSoFarThisMonth / minutesInMonth) * 100, 2);

    const grids = await supabase
      .from('grids')
      .select('id, name, monthly_rental')
      .eq('organization_id', organizationId)
      .eq('is_hidden_from_reporting', false)
      .is('deleted_at', null)
      .then(handleResponse)
    ;

    if (!grids.length) return;

    const revenueNotificationParameters = {
      date: nowMoment.toISOString(),
      date_string: nowMoment.format('MMM Do, YYYY'),
      percentage_of_month_elapsed: percentageOfMonthElapsed,
      percentage_of_month_elapsed_string: `${ percentageOfMonthElapsed }%`,
      grids: [],
      agents: [],
      customers: [],
      issues: [],
    };

    // Produce reports for all the grids belonging to this organization
    for(const grid of grids) {
      const report = await this.gatherReportInformationForGrid(grid);
      const { agent_reports, customer_reports, top_issues, ...restOfGridReport } = report;
      revenueNotificationParameters.grids = [ ...revenueNotificationParameters.grids, restOfGridReport ];
      revenueNotificationParameters.agents = [ ...revenueNotificationParameters.agents, ...agent_reports ];
      revenueNotificationParameters.customers = [ ...revenueNotificationParameters.customers, ...customer_reports ];
      revenueNotificationParameters.issues = [ ...revenueNotificationParameters.issues, ...top_issues ];
    }

    // Sort to have oldest issues first
    revenueNotificationParameters.issues = sortBy(issue => issue.started_at, revenueNotificationParameters.issues);

    // Create notification parameters
    const notificationParameter = await supabase
      .from('notification_parameters')
      .insert({ parameters: revenueNotificationParameters })
      .select('id')
      .single()
      .then(handleResponse)
    ;

    // Get all the members that are supposed to receive the notification withing that grid
    const subscribedMembers = await supabase
      .from('members')
      .select('...accounts(email)')
      .eq('member_type', 'FINANCE')
      .eq('account.organization_id', organizationId)
      .is('account.deleted_at', null)
      .then(handleResponse)
    ;

    const emailsToSend = subscribedMembers.map(({ email }) => {
      return {
        email,
        subject: 'Revenue report',
        notification_parameter_id: notificationParameter.id,
        organization_id: organizationId,
        notification_type: 'GRID_REVENUE' as NotificationTypeEnum,
        carrier_external_system: 'SENDGRID' as ExternalSystemEnum,
        connector_external_system: 'SENDGRID' as ExternalSystemEnum,
      };
    });

    await this.notificationsService.create(emailsToSend);
  }

  private async gatherReportInformationForGrid(grid: { id: number; name: string; monthly_rental: number; }) {
    const { adminClient: supabase, handleResponse } = this.supabaseService;

    const beginningOfThisMonth = moment().startOf('month');
    const beginningOfLastMonth = beginningOfThisMonth.clone().subtract(1, 'month').startOf('month');
    const lastMonthAtThisPoint = moment().subtract(1, 'month');
    const now = moment();

    // Doing regular Supabase return data because we need the data AND the count
    const { data: oldestFourCommercialIssues, count: commercial_issues } = await supabase
      .from('issues')
      .select(`
        id,
        issue_status,
        issue_type,
        started_at,
        meter:meter_id!inner(
          id,
          external_reference,
          connection:connections!inner(
            customer:customers!inner(
              grid_id,
              account:accounts(
                full_name
              )
            )
          )
        )
      `, { count: 'exact' })
      .eq('meter.connection.customer.grid_id', grid.id)
      .eq('issue_status', 'OPEN')
      .in('issue_type', COMMERCIAL_ISSUE_TYPES)
      .order('started_at')
      .limit(4)
    ;

    const top_issues = oldestFourCommercialIssues.map(issue => ({
      started_at: issue.started_at,
      started_at_string: moment(issue.started_at).format('MMM Do, YYYY'),
      customer_full_name: issue.meter.connection.customer.account.full_name,
      grid_name: grid.name,
      link: `${ process.env.AYRTON_URL }/grid/${ grid.id }/meter/${ issue.meter.id }`,
      meter_external_reference: issue.meter.external_reference,
      issue_type: issue.issue_type,
    }));

    const [ revenue_this_month, revenue_last_month_total, revenue_last_month_at_this_point, customer_reports ] = await Promise.all([
      this.spendingService.findEnergyTopupRevenue(grid.id, { start: beginningOfThisMonth, end: now }),
      this.spendingService.findEnergyTopupRevenue(grid.id, { start: beginningOfLastMonth, end: beginningOfThisMonth }),
      this.spendingService.findEnergyTopupRevenue(grid.id, { start: beginningOfLastMonth, end: lastMonthAtThisPoint }),
      this.spendingService.findTopSpenders(grid.id, { start: lastMonthAtThisPoint, end: now }),
    ]);

    const agents = await supabase
      .from('agents')
      .select(`
        id,
        account:accounts!inner(
          full_name
        ),
        wallet:wallets(
          balance
        )
      `)
      .is('account.deleted_at', null)
      .eq('grid_id', grid.id)
      .order('account(full_name)')
      .then(handleResponse)
    ;

    const agent_reports = [];
    for(const agent of agents) {
      const [ revenue_this_month, revenue_last_month_total, topups_this_month ] = await Promise.all([
        this.getAgentRevenue(agent.id, beginningOfThisMonth, now),
        this.getAgentRevenue(agent.id, beginningOfLastMonth, beginningOfThisMonth),
        this.getAgentNumberOfTopups(agent.id, beginningOfThisMonth, now),
      ]);
      agent_reports.push({
        id: agent.id,
        full_name: agent.account.full_name,
        link: `${ process.env.AYRTON_URL }/grid/${ grid.id }/agent/${ agent.id }`,
        balance: formatCurrency(agent.wallet.balance, 'NGN'),
        grid_name: grid.name,
        topups_this_month,
        revenue_this_month,
        revenue_this_month_string: formatCurrency(revenue_this_month, 'NGN'),
        revenue_last_month_total,
        revenue_last_month_total_string: formatCurrency(revenue_last_month_total, 'NGN'),
      });
    }

    return {
      id: grid.id,
      name: grid.name,
      currency: 'NGN',
      dashboard_link: `${ process.env.AYRTON_URL }/grid/${ grid.id }`,
      topups_link: `${ process.env.AYRTON_URL }/grid/${ grid.id }/top-ups`,
      issues_link: `${ process.env.AYRTON_URL }/grid/${ grid.id }/issues`,
      revenue_this_month,
      revenue_this_month_string: formatCurrency(revenue_this_month, 'NGN'),
      revenue_last_month_at_this_point,
      revenue_last_month_at_this_point_string: formatCurrency(revenue_last_month_at_this_point, 'NGN'),
      revenue_last_month_total,
      revenue_last_month_total_string: formatCurrency(revenue_last_month_total, 'NGN'),
      percent_of_monthly_target: revenue_last_month_at_this_point / grid.monthly_rental,
      percent_of_monthly_target_string: `${ (revenue_last_month_at_this_point / grid.monthly_rental) * 100 }%`,
      agent_reports,
      commercial_issues,
      estimated_monthly_cost: grid.monthly_rental,
      estimated_monthly_cost_string: formatCurrency(grid.monthly_rental, 'NGN'),
      customer_reports,
      top_issues,
    };
  }

  private async getAgentRevenue(agentId: number, start: moment.Moment, end: moment.Moment) {
    return 0;
    // This queries from 'order_snapshots' but that doesn't exist anymore, fix if it's needed
    const query = `
      select sum(order_snapshots.amount) as total
      from order_snapshots
      where receiver_type = $1
      and order_snapshots.status = $2
      and sender_wallet_id = $3
      and created_at >= $4
      and created_at < $5
    `;
    const params = [
      'METER',
      'COMPLETED',
      agentId,
      start.format('YYYY-MM-DD HH:mm:ss'),
      end.format('YYYY-MM-DD HH:mm:ss'),
    ];

    const rows = await this.pgService.query(query, params);
    return toSafeNumberOrZero(rows[0].total);
  }

  private async getAgentNumberOfTopups(agentId: number, start: moment.Moment, end: moment.Moment) {
    return 0;
    // This queries from 'order_snapshots' but that doesn't exist anymore, fix if it's needed
    const query = `
      select count(*) as count
      from order_snapshots
      where receiver_type = $1
      and order_snapshots.status = $2
      and sender_wallet_id = $3
      and created_at >= $4
      and created_at < $5
    `;
    const params = [
      'METER',
      'COMPLETED',
      agentId,
      start.format('YYYY-MM-DD HH:mm:ss'),
      end.format('YYYY-MM-DD HH:mm:ss'),
    ];

    const rows = await this.pgService.query(query, params);
    return toSafeNumberOrZero(rows[0].count);
  }
}
