// For now we are not using this service. Commenting out until further notice.

// import { SupabaseService } from '@core/modules/supabase.module';
// import { IssueStatusEnum } from '@core/types/supabase-types';
// import { mapAsyncSequential } from '@helpers/promise-helpers';

// import { Injectable } from '@nestjs/common';
// import { Cron } from '@nestjs/schedule';
// import { InjectDataSource } from '@nestjs/typeorm';
// import moment from 'moment';
// import { DataSource } from 'typeorm';

// @Injectable()
// export class LostRevenueService {

//   constructor(
//     private readonly dataSource: DataSource,
//     @InjectDataSource('timescale')
//     protected readonly timescale: DataSource,
//     private readonly supabaseService: SupabaseService,
//   ) {}

//   isLostRevenueCalculationRunning = false;

//   // run this every night at 3 am
//   @Cron('0 3 * * *', { disabled: process.env.NXT_ENV !== 'production' })
//   async run() {
//     if (this.isLostRevenueCalculationRunning) return;
//     this.isLostRevenueCalculationRunning = true;

//     const size = 1000;
//     let page = 0;
//     let openIssueStats: any[];
//     let issuesToUpdate: any[] = [];

//     try {
//       const now = moment();
//       const oneWeekAgo = moment(now).subtract(1, 'week');
//       const consumptions: any[] = await this.findAvgHourlyConsumptionInAllGridsByStartAndEndGroupedByGridAndMeterType(oneWeekAgo, now);
//       // console.info('consumptions ');
//       // console.info(consumptions);
//       do {
//         issuesToUpdate = [];
//         // if there are some open issues, then find whatm, in the last week, was the average hourly consumption
//         // for HPS/FS meters
//         openIssueStats = await this.findIssueStatsByIssueStatusAndMeterIsNotNull('OPEN', size, page++ * size);
//         if (openIssueStats.length < 1) {
//           break;
//         }

//         for (const issueStat of openIssueStats) {
//           const consumption: any = consumptions.find(({ grid_id, meter_type }) =>
//             grid_id === issueStat.grid_id && issueStat.meter_type === meter_type);

//           if (!consumption) {
//             // console.info('nothing found for');
//             // console.info(o);
//             continue;
//           }

//           issuesToUpdate.push({
//             id: issueStat.id,
//             estimated_lost_revenue: (Number(consumption.avg) || 0) * (issueStat.hours || 0),
//           });
//         }

//         const { handleResponse, adminClient: supabase } = this.supabaseService;
//         await mapAsyncSequential(async ({ id, estimated_lost_revenue }) => {
//           return supabase.from('issues').update({ estimated_lost_revenue }).eq('id', id).then(handleResponse);
//         })(issuesToUpdate);

//       } while (openIssueStats.length > 0);
//     }
//     catch (err) {
//       console.error(err);
//     }
//     finally {
//       this.isLostRevenueCalculationRunning = false;
//     }
//   }

//   async findAvgHourlyConsumptionInAllGridsByStartAndEndGroupedByGridAndMeterType(start: moment.Moment, end: moment.Moment): Promise<any[]> {

//     const res = await this.timescale.query(query, [
//       start.format('YYYY-MM-DD HH:mm:ss'),
//       end.format('YYYY-MM-DD HH:mm:ss'),
//     ]);

//     return res;
//   }

//   async findIssueStatsByIssueStatusAndMeterIsNotNull(issueStatus: IssueStatusEnum, limit: number, offset: number) {
//     const issueStats = await this.dataSource.query(query, [
//       issueStatus,
//       limit,
//       offset,
//     ],
//     );

//     // format to number
//     for (const issueStat of issueStats) {
//       issueStat.hours = Number(issueStat.hours);
//     }

//     return issueStats;
//   }
// }
