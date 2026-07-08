// import { Controller, UseGuards } from '@nestjs/common';
// import { DirectiveWatchdogSessionsService } from './directive-watchdog-sessions.service';
// import { AuthenticationGuard } from '../auth/authentication.guard';
// @UseGuards(AuthenticationGuard)
// @Controller('directive-watchdog-sessions')
// export class DirectiveWatchdogSessionsController {
//   constructor(
//     private readonly directiveWatchdogSessionsService: DirectiveWatchdogSessionsService,
//   ) {}

//   // @Post('debug-meter')
//   // setMeterToDebug(@Body('meterToDebug') meterToDebug: string) {
//   //   if (!meterToDebug.startsWith('47001')) {
//   //     throw new HttpException(`Invalid meter ext reference ${ meterToDebug }, must start with 47001`, 400);
//   //   }
//   //   return this.directiveWatchdogSessionsService.setMeterToDebug(meterToDebug);
//   // }
// }
