import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CreateCustomerDto } from '@nxt/core';

import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/authenticated-user.js';
import { AuthenticationGuard } from '../auth/authentication.guard.js';
import { CreateAgentDto } from './dto/create-agent.dto.js';
import { InviteMemberDto } from './dto/invite-member.dto.js';
import { UpdateAgentDto } from './dto/update-agent.dto.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';
import { UpdateMemberDto } from './dto/update-member.dto.js';
import { UserAdminService } from './user-admin.service.js';

@UseGuards(AuthenticationGuard)
@Controller('user-admin')
export class UserAdminController {
  constructor(protected readonly service: UserAdminService) {}

  @Post('invite-member')
  inviteMember(
    @Body() body: InviteMemberDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.inviteMember(body, user);
  }

  @Post('update-member')
  updateMember(
    @Body() body: UpdateMemberDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.updateMember(body, user);
  }

  @Post('create-agent')
  createAgent(
    @Body() body: CreateAgentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.createAgent(body, user);
  }

  @Post('update-agent')
  updateAgent(
    @Body() body: UpdateAgentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.updateAgent(body, user);
  }

  @Post('create-customer')
  createCustomer(
    @Body() body: CreateCustomerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.createCustomer(body, user);
  }

  @Post('update-customer')
  updateCustomer(
    @Body() body: UpdateCustomerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.updateCustomer(body, user);
  }

  @Delete('member/:id')
  deleteMember(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.deleteAccount(parseInt(id, 10), 'MEMBER', user);
  }

  @Delete('agent/:id')
  deleteAgent(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.deleteAccount(parseInt(id, 10), 'AGENT', user);
  }

  @Delete('customer/:id')
  deleteCustomer(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.deleteAccount(parseInt(id, 10), 'CUSTOMER', user);
  }
}
