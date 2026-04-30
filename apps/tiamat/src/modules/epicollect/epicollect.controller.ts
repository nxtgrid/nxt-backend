import { Body, Controller, Get, Post, UnauthorizedException, UseGuards } from '@nestjs/common';
import { EpicollectService } from './epicollect.service';
import { AuthenticationGuard } from '../auth/authentication.guard';
import { CurrentUser, NxtSupabaseUser } from '../auth/nxt-supabase-user';

@UseGuards(AuthenticationGuard)
@Controller('epicollect')
export class EpicollectController {
  constructor(protected readonly epicollectService: EpicollectService) { }

  @Post('sync-one-survey')
  async syncOneSurvey(
    @CurrentUser() user: NxtSupabaseUser,
    @Body() body,
  ): Promise<any> {
    if (!user.is_nxt_grid_member)
      throw new UnauthorizedException('Unauthorized since you do not belong to NXT Grid');

    return this.epicollectService.syncOneSurvey(body);
  }

  @Post('sync-one-organization')
  async syncOneOrganization(
    @CurrentUser() user: NxtSupabaseUser,
    @Body() body,
  ): Promise<any> {
    if (!user.is_nxt_grid_member)
      throw new UnauthorizedException('Unauthorized since you do not belong to NXT Grid');

    return this.epicollectService.syncOneOrganization(body);
  }

  @Get('sync')
  async syncAll(
    @CurrentUser() user: NxtSupabaseUser,
  ): Promise<any> {
    if (!user.is_nxt_grid_member)
      throw new UnauthorizedException('Unauthorized since you do not belong to NXT Grid');

    return this.epicollectService.syncAll();
  }
}
