import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import moment from 'moment';
import { RAW_QUERIES, MeterAvgConsumptionByDay, MeterAvgConsumptionByDayParams } from '@tiamat/queries';

import { Meter } from '@core/modules/meters/entities/meter.entity';
import { Issue } from '@core/modules/issues/entities/issue.entity';

import { GridsService } from '@tiamat/modules/grids/grids.service';
import { MetersService } from '@tiamat/modules/meters/meters.service';
import { Constants, MeterTypeEnum } from '@core/types/supabase-types';

@Injectable()
export class LostRevenueService {
  constructor(
    private readonly metersService: MetersService,
    private readonly gridsService: GridsService,
    @InjectDataSource('timescale')
    protected readonly timescale: DataSource,
  ) { }

  relevantIssueTypes = [ 'NO_CONSUMPTION', 'NO_CREDIT' ];

  // This is used for the calc of the avg daily consumption of working meters
  // We only consider the current month
  NUMBER_OF_DAYS = moment().date();

  private isValidIssue(issue: Issue | null): boolean {
    if (!issue) {
      return false;
    }

    const hasValidStatus = issue.issue_status != null && Constants.public.Enums.issue_status_enum.includes(issue.issue_status);
    const hasValidType = issue.issue_type != null && Constants.public.Enums.issue_type_enum.includes(issue.issue_type);

    const hasValidCreatedAt = issue.created_at != null && moment(issue.created_at).isValid();
    const hasValidClosedAt = !issue.closed_at || moment(issue.closed_at).isValid(); // closed_at can be null/undefined

    return hasValidStatus && hasValidType && hasValidCreatedAt && hasValidClosedAt;
  }


  isMeterLosingMoney(meter: Meter) {
    const { last_encountered_issue } = meter;
    if (!this.isValidIssue(last_encountered_issue)) {
      return false;
    }

    const firstDayOfMonth = moment().startOf('month').toDate();
    const isItTheRightIssueType = this.relevantIssueTypes.includes(last_encountered_issue.issue_type);
    const isOpenIssue = last_encountered_issue.issue_status === 'OPEN';
    const isIssueClosedThisMonth = last_encountered_issue.closed_at > firstDayOfMonth;

    // This is tough to read, but it's basically saying:
    // ONLY issue of type NO_CONSUMPTION or NO_CREDIT
    // AND
    // either it's an open issue, or it's a closed issue that was closed this month
    return isItTheRightIssueType && (isOpenIssue || isIssueClosedThisMonth);
  }

  groupMetersByType(meters: Meter[]): Record<MeterTypeEnum, Meter[]> {
    return meters.reduce((acc, meter) => {
      if (meter.meter_type in acc) {
        acc[meter.meter_type].push(meter);
      }
      else {
        acc[meter.meter_type] = [ meter ];
      }
      return acc;
    }, {
      FS: [],
      HPS: [],
    });
  }

  async groupMetersByPerformance(meters: Meter[]) {
    const metersLosingMoney = meters.filter(meter => this.isMeterLosingMoney(meter));

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const metersWorkingFineMoreThanThirtyDays = meters.filter( ({ last_encountered_issue })  => {
      return !last_encountered_issue ||
      (last_encountered_issue.closed_at < thirtyDaysAgo && last_encountered_issue.issue_status === 'CLOSED');
    });

    const metersLosingMoneyByType = this.groupMetersByType(metersLosingMoney);
    const metersMakingMoneyByType = this.groupMetersByType(metersWorkingFineMoreThanThirtyDays);

    return {
      metersLosingMoneyByType,
      metersMakingMoneyByType,
    };
  }

  async getAverageDailyConsumptionByMeterIdsLastXDays(meterIds: number[], numberOfDays: number): Promise<object> {
    if (meterIds.length === 0) {
      return {};
    }

    try {
      // The last 3 days of data are not saved in timescale.
      // We might want to check this later on
      // since that means that we only check for the last 27 days
      const params: MeterAvgConsumptionByDayParams = [ meterIds, numberOfDays ];
      const result: MeterAvgConsumptionByDay[] = await this.timescale.query(RAW_QUERIES.sql.timescale.lostRevenue.getAvgConsumption, params);

      if (result.length === 0) {
        return {};
      }
      // change this to have the avg consumption for each day
      const reducedAvg = result.reduce((acc, { avg_consumption, date }) => {
        const formattedDate = moment(date).format('YYYY-MM-DD');
        acc[formattedDate] = avg_consumption;
        return acc;
      }, {});
      return reducedAvg;
    }
    catch (err) {
      console.error('Error lostrevenue', err);
      return {};
    }
  }

  calculateIssueDays(meters: Meter[]): Record<string, number> {
    const startOfMonth = moment().startOf('M');
    const today = moment();

    return meters.reduce((counter, meter) => {
      const created_at = moment(meter.last_encountered_issue.created_at);
      const closed_at = meter.last_encountered_issue.closed_at ? moment(meter.last_encountered_issue.closed_at) : moment().add(1, 'days');

      // Start iteration from the later of startOfMonth or created_at
      // because it can be that the issue was created before the start of the month
      let selectedDay = moment.max(created_at, startOfMonth);

      // Iterate until the earlier of closed_at or today
      while (selectedDay.isSameOrBefore(closed_at) && selectedDay.isSameOrBefore(today)) {
        let daysFraction: number;

        if (selectedDay.isSame(created_at, 'day') || selectedDay.isSame(closed_at, 'day')) {
          // Calculate hours for the first or last day of the issue
          const startOfDay = selectedDay.clone().startOf('day');
          const endOfDay = selectedDay.clone().endOf('day');
          const segmentStart = selectedDay.isSame(created_at, 'day') ? created_at : startOfDay;
          const segmentEnd = selectedDay.isSame(closed_at, 'day') ? closed_at : endOfDay;

          const hoursDiff = segmentEnd.diff(segmentStart, 'hours', true);
          daysFraction = hoursDiff / 24;
        }
        else {
          // Count full day for days in between
          daysFraction = 1;
        }

        const dateString = selectedDay.format('YYYY-MM-DD');
        counter[dateString] = (counter[dateString] || 0) + daysFraction;

        // Clone, otherwise it mutates createad_at or startOfMonth
        selectedDay = selectedDay.clone().add(1, 'days');
      }

      return counter;
    }, {} as Record<string, number>);
  }

  getTotalDaysWithIssuesByType(metersLosingMoneyByType): {
    lostHPSRevenueDays: Record<string, number>,
    lostFSRevenueDays: Record<string, number>,
  } {
    return {
      lostHPSRevenueDays: this.calculateIssueDays(metersLosingMoneyByType.HPS),
      lostFSRevenueDays: this.calculateIssueDays(metersLosingMoneyByType.FS),
    };
  }

  checkIfMetersAreNotLosingMoney(meters: Record<MeterTypeEnum, Meter[]>) {
    return meters.FS.length === 0 && meters.HPS.length === 0;
  }

  calculateNotConsumedKWHPerDay(lostDays: object, avgConsumptionPerDay: object) {
    if(!Object.keys(lostDays).length || !Object.keys(avgConsumptionPerDay).length) {
      return {};
    }

    const total = {};
    for(const date in lostDays) {
      total[date] = lostDays[date] * avgConsumptionPerDay[date] || 0; // to prevent NaN
    }
    return total;
  }

  async calcTotalLostRevenueByMeterType(gridId: number): Promise<{
    totalHPSRevenueLost?: number | null,
    totalFSRevenueLost?: number | null,
    dayWithHighestLossHPS?: any,
    dayWithHighestLossFS?: any,
  }> {

    const meters: Meter[] = await this.metersService.findByGridIdAndIsUnassigned(gridId, false);
    if(meters.length === 0) {
      return {
        totalHPSRevenueLost: null,
        totalFSRevenueLost: null,
      };
    }

    const {
      kwh_tariff_essential_service,
      kwh_tariff_full_service,
    } = await this.gridsService.findOne(gridId);

    if(!kwh_tariff_essential_service || !kwh_tariff_full_service) {
      return {
        totalHPSRevenueLost: null,
        totalFSRevenueLost: null,
      };
    }

    const {
      metersLosingMoneyByType,
      metersMakingMoneyByType,
    } = await this.groupMetersByPerformance(meters);

    // if there are no meters losing money, we can return early
    if (this.checkIfMetersAreNotLosingMoney(metersLosingMoneyByType)) {
      return {
        totalHPSRevenueLost: 0,
        totalFSRevenueLost: 0,
      };
    }
    const {
      lostHPSRevenueDays,
      lostFSRevenueDays,
    } = this.getTotalDaysWithIssuesByType(metersLosingMoneyByType);

    const avgHPSdailyConsumptionPerDay = await this.getAverageDailyConsumptionByMeterIdsLastXDays(metersMakingMoneyByType.FS.map(({ id }) => id), this.NUMBER_OF_DAYS);
    const avgFSdailyConsumptionPerDay = await this.getAverageDailyConsumptionByMeterIdsLastXDays(metersMakingMoneyByType.HPS.map(({ id }) => id), this.NUMBER_OF_DAYS);
    const HPSkWhNotConsumedPerDay = this.calculateNotConsumedKWHPerDay(lostHPSRevenueDays, avgHPSdailyConsumptionPerDay);
    const FSkWhNotConsumedPerDay = this.calculateNotConsumedKWHPerDay(lostFSRevenueDays, avgFSdailyConsumptionPerDay);

    // We might want to know which days were the worst, so keeping the date in the object for now
    // and using Object.values and reduce to get the total
    const totalHPSRevenueLost = Object.values(HPSkWhNotConsumedPerDay).map(kWh => Math.round(Number(kWh) * kwh_tariff_essential_service))
      .reduce((acc, val) => acc + val, 0);

    const totalFSRevenueLost = Object.values(FSkWhNotConsumedPerDay).map(kWh => Math.round(Number(kWh) * kwh_tariff_full_service) )
      .reduce((acc, val) => acc + val, 0);

    // Let's send also the day with the highest loss
    const dayWithHighestLossHPS = Object.entries(HPSkWhNotConsumedPerDay).reduce((max, entry) => max[1] > entry[1] ? max : entry, {});
    const dayWithHighestLossFS = Object.entries(FSkWhNotConsumedPerDay).reduce((max, entry) => max[1] > entry[1] ? max : entry, {});
    return {
      totalHPSRevenueLost,
      totalFSRevenueLost,
      dayWithHighestLossHPS: dayWithHighestLossHPS,
      dayWithHighestLossFS: dayWithHighestLossFS,
    };
  }
}
