import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CurrentUser, NxtSupabaseUser } from './nxt-supabase-user';
import { AuthenticationGuard } from './authentication.guard';

@UseGuards(AuthenticationGuard)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService,
  ) { }

  @Get('grafana-token')
  getGrafanaToken(
    @CurrentUser() user: NxtSupabaseUser,
  ) {
    return this.authService.generateAccessToken(user.account);
  }
}
