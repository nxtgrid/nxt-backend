import { Controller, Post, UseGuards, Body, Delete, Param } from '@nestjs/common';
import { AuthenticationGuard } from '../auth/authentication.guard';
import { UserAdminService } from './user-admin.service';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { CreateCustomerDto } from '@core/modules/customers/dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CurrentUser, NxtSupabaseUser } from '../auth/nxt-supabase-user';

@UseGuards(AuthenticationGuard)
@Controller('user-admin')
export class UserAdminController {
  constructor(protected readonly service: UserAdminService) {}

  @Post('invite-member')
  inviteMember(
    @Body() body: InviteMemberDto,
    @CurrentUser() user: NxtSupabaseUser,
  ) {
    return this.service.inviteMember(body, user);
  }

  @Post('update-member')
  updateMember(
    @Body() body: UpdateMemberDto,
    @CurrentUser() user: NxtSupabaseUser,
  ) {
    return this.service.updateMember(body, user);
  }

  @Post('create-agent')
  createAgent(
    @Body() body: CreateAgentDto,
    @CurrentUser() user: NxtSupabaseUser,
  ) {
    return this.service.createAgent(body, user);
  }

  @Post('update-agent')
  updateAgent(
    @Body() body: UpdateAgentDto,
    @CurrentUser() user: NxtSupabaseUser,
  ) {
    return this.service.updateAgent(body, user);
  }

  @Post('create-customer')
  createCustomer(
    @Body() body: CreateCustomerDto,
    @CurrentUser() user: NxtSupabaseUser,
  ) {
    return this.service.createCustomer(body, user);
  }

  @Post('update-customer')
  updateCustomer(
    @Body() body: UpdateCustomerDto,
    @CurrentUser() user: NxtSupabaseUser,
  ) {
    return this.service.updateCustomer(body, user);
  }

  @Delete('member/:id')
  deleteMember(
    @Param('id') id: string,
    @CurrentUser() user: NxtSupabaseUser,
  ) {
    return this.service.deleteAccount(parseInt(id), 'MEMBER', user);
  }

  @Delete('agent/:id')
  deleteAgent(
    @Param('id') id: string,
    @CurrentUser() user: NxtSupabaseUser,
  ) {
    return this.service.deleteAccount(parseInt(id), 'AGENT', user);
  }

  @Delete('customer/:id')
  deleteCustomer(
    @Param('id') id: string,
    @CurrentUser() user: NxtSupabaseUser,
  ) {
    return this.service.deleteAccount(parseInt(id), 'CUSTOMER', user);
  }
}
