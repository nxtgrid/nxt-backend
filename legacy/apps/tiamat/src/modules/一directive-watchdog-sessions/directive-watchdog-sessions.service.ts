// import { Injectable } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { v4 as uuidv4 } from 'uuid';
// import moment from 'moment';

// import { DirectiveWatchdogSession } from '@core/modules/directive-watchdog-sessions/entities/directive-watchdog-session.entity';
// import { Meter } from '@core/modules/meters/entities/meter.entity';

// import { CreateDirectiveWatchdogSessionInput } from '@core/modules/directive-watchdog-sessions/dto/create-directive-watchdog-session.input';

// import { DirectiveWatchdogSessionsService as CoreDirectiveWatchdogService } from '@core/modules/directive-watchdog-sessions/directive-watchdog-sessions.service';
// import { MetersService } from '@tiamat/modules/meters/meters.service';

// @Injectable()
// export class DirectiveWatchdogSessionsService extends CoreDirectiveWatchdogService {
//   isSessionRunning = false;

//   constructor(
//     @InjectRepository(DirectiveWatchdogSession)
//     protected readonly directiveWatchdogSessionRepository: Repository<DirectiveWatchdogSession>,
//     protected readonly metersService: MetersService,
//   ) {
//     super(directiveWatchdogSessionRepository);
//   }

//   async create(createDwInput: CreateDirectiveWatchdogSessionInput) {
//     const qb = this.directiveWatchdogSessionRepository.createQueryBuilder('directive_watchdog_sessions');

//     await qb.insert()
//       .values(createDwInput)
//       .orIgnore() //we ignore if there are conflicts, as it means that another node attempted the same thing with the same value
//       .execute();

//     return this.findByIdentifier(createDwInput.identifier);
//   }

//   // Only focuses on the grids where there are no upcoming fs control rules in the coming hour, or where
//   // there has been an fs control rule in the last hour. This is because we want to give time to the
//   // rules to be executed (it may take up to 30 minutes for them to complete sometimes).

//   // Given a list of eligible grids, we find all the meters with a PLS or ON/OFF mismatch that are
//   // not in manual mode, and create the corresponding directives
//   // @Cron('0 * * * *', { disabled: process.env.NXT_ENV !== 'production' })
//   async run() {
//     if (this.isSessionRunning) return;
//     this.isSessionRunning = true;

//     try {
//       // First we create the watchdog session.
//       const createdAt = moment()
//         .minute(0)
//         .second(0)
//         .millisecond(0);
//       const newWatchdog: CreateDirectiveWatchdogSessionInput = { identifier: createdAt.unix().toString() };
//       const session = await this.create(newWatchdog);

//       // The watchdog should not involve all grids, but only the ones where there are no upcoming fs control rules
//       // in the next hour and no fs rule executions for the past hour
//       // const gridsWithNoFsActivityInTheLastHour: Grid[] = await this.getGridsWithNoActivityIntheLastHours(1);
//       const size = 100;
//       let metersToFix: Meter[] = [];

//       do {
//         const uuid = uuidv4(); //Changes at every page, since we do not want to refetch the same meters at every iteration
//         metersToFix = await this.metersService.lockNextPageOfMetersWithDiscrepancy(uuid, createdAt, size);
//         if (metersToFix.length < 1) break;

//         await this.processMeters(metersToFix, session);

//       } while (metersToFix.length > 0);
//     }
//     catch (err) {
//       console.error(err);
//     }
//     finally {
//       this.isSessionRunning = false;
//     }
//   }

//   processMeters(meters: Meter[], session: DirectiveWatchdogSession) {
//     console.warn('WATCHDOG NOT IMPLEMENTED', session);
//     // const directives = meters
//     //   .filter(meter => meter.is_on !== meter.should_be_on || meter.power_limit_should_be !== meter.power_limit)
//     //   .map(meter => {
//     //     if (meter.is_on !== meter.should_be_on) {
//     //       return {
//     //         directive_status: 'PENDING',
//     //         directive_type: (meter.should_be_on) ? 'ON' : 'OFF',
//     //         meter_id: meter.id,
//     //         directive_watchdog_session: session,
//     //         directive_priority: 600,
//     //       };
//     //     }
//     //     else { // set the correct power limit
//     //       return {
//     //         directive_status: 'PENDING',
//     //         directive_type: 'PLS',
//     //         meter_id: meter.id,
//     //         power_limit_should_be: meter.power_limit_should_be,
//     //         directive_watchdog_session: session,
//     //         directive_priority: 600,
//     //       };
//     //     }
//     //   });

//     // return this.directiveRouterService.create(directives);
//   }

//   // We want to try to fix HPS meters even though they
//   // might be in a grid that is about to have a directive batch.
//   // private async getGridsWithNoActivityIntheLastHours(hours: number): Promise<number[]> {
//   //   const now = moment();
//   //   const oneHourAgo = moment(now).subtract(hours, 'hour');

//   //   const upcomingFSControlRules: DirectiveBatch[] = await this.directive batch service.find Upcoming By Start And Within Hours(now, hours); // splitting this since to avoid making the lock query too complex
//   //   const recentlyExecutedFSControlRules: DirectiveBatchExecution[] = await this.directive batch execution service.find By Created After(oneHourAgo);

//   //   const upcomingGridIdSet = upcomingFSControlRules.map(({ grid }) => grid.id);
//   //   const recentlyExecutedGridIdSet = recentlyExecutedFSControlRules.map(({ directive_batch }) => directive_batch.grid.id);

//   //   return uniq([ ...upcomingGridIdSet, ...recentlyExecutedGridIdSet ]);
//   // }
// }
