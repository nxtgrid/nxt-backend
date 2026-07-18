import { Controller, Get, UseGuards } from '@nestjs/common';

import {
  CurrentUser,
  type AuthenticatedUser,
} from './authenticated-user.js';
import { AuthenticationGuard } from './authentication.guard.js';

/** Early probe for JWKS / API-key auth — returns the authenticated principal. */
@UseGuards(AuthenticationGuard)
@Controller('auth')
export class AuthController {
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return {
      email: user.email,
      full_name: user.full_name,
      account_type: user.account_type,
      member_type: user.member_type,
      account_id: user.account_id,
      organization_id: user.organization_id,
      supabase_id: user.supabase_id,
    };
  }
}
