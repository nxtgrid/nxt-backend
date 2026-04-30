// import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
// import { DemoService } from './demo.service';
// import { AuthenticationGuard } from '../auth/authentication.guard';
// import { CurrentUser, NxtSupabaseUser } from '../auth/nxt-supabase-user';

// @Controller('demo')
// export class DemoController {
//   constructor(
//     protected readonly demoService: DemoService,
//   ) { }

//   @UseGuards(AuthenticationGuard)
//   @Get('reset')
//   async demoReset(
//     @CurrentUser() user: NxtSupabaseUser,
//   ): Promise<any> {
//     this.demoService.resetDemoGrid(user);
//     return { response: 'ok' };
//   }

//   @Post('log-payload')
//   logPayload(@Body() body) {
//     console.info(body);
//     return 'logged your test';
//   }
// }
