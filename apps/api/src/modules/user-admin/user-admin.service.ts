import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { UserResponse } from '@supabase/supabase-js';
import { pick } from 'ramda';
import {
  CreateCustomerDto,
  SupabaseService,
  throwSupabaseError,
} from '@nxt/core';
import type {
  AccountTypeEnum,
  MemberTypeEnum,
} from '@nxt/core/types/supabase-types';

import type { AuthenticatedUser } from '../auth/authenticated-user.js';
import type { CreateAgentDto } from './dto/create-agent.dto.js';
import type { InviteMemberDto } from './dto/invite-member.dto.js';
import type { UpdateAgentDto } from './dto/update-agent.dto.js';
import type { UpdateCustomerDto } from './dto/update-customer.dto.js';
import type { UpdateMemberDto } from './dto/update-member.dto.js';

interface SupabaseUserMetadata {
  full_name: string;
}

interface SupabaseAppMetadata {
  account_id: number;
  account_type: AccountTypeEnum;
  member_type?: MemberTypeEnum;
  organization_id: number;
  grid_id?: number;
}

interface AccountEmbed {
  id: number;
  supabase_id: string;
  organization_id: number;
}

/**
 * Privileged user administration (members, agents, customers).
 *
 * Whole-method admin client: Auth Admin APIs and follow-on DB writes cannot run
 * under RLS. Callers may be bearer or API-key; API-key principals currently have
 * no RLS-bound user client — see ADR-014 §5.3 (near-future).
 */
@Injectable()
export class UserAdminService {
  private readonly logger = new Logger(UserAdminService.name);

  constructor(private readonly supabase: SupabaseService) {}

  private handleUserResponse(res: UserResponse) {
    const { data, error } = res;
    if (error) {
      throwSupabaseError(error, undefined, this.logger);
    }
    return data.user;
  }

  private requireRow<T>(row: T | null, context: string): T {
    if (row == null) {
      throw new NotFoundException(`${ context }: no row returned`);
    }
    return row;
  }

  async inviteMember(
    {
      email,
      redirectTo,
      full_name,
      organization_id,
      member_type,
      busy_commissioning_id,
    }: InviteMemberDto,
    author: AuthenticatedUser,
  ) {
    await author.validate();

    const user_metadata: SupabaseUserMetadata = { full_name: full_name.trim() };
    const user = await this.supabase.adminClient.auth.admin
      .inviteUserByEmail(email, { data: user_metadata, redirectTo })
      .then(res => this.handleUserResponse(res));

    const account = this.requireRow(
      await this.supabase.adminClient
        .from('accounts')
        .select('id')
        .eq('supabase_id', user.id)
        .single()
        .then(this.supabase.handleResponse),
      'inviteMember account',
    );

    const app_metadata: SupabaseAppMetadata = {
      account_id: account.id,
      account_type: 'MEMBER',
      member_type,
      organization_id,
    };
    await this.supabase.adminClient.auth.admin
      .updateUserById(user.id, { app_metadata })
      .then(res => this.handleUserResponse(res));

    const member = this.requireRow(
      await this.supabase.adminClient
        .from('members')
        .insert({
          account_id: account.id,
          member_type,
          busy_commissioning_id,
        })
        .select()
        .single()
        .then(this.supabase.handleResponse),
      'inviteMember member',
    );

    const message = `${ author.full_name } invited a new member ${ full_name } (${ email }) with ${ member_type } role`;
    void this.supabase.adminClient
      .from('audits')
      .insert({
        message,
        author_id: author.account_id,
        organization_id,
        member_id: member.id,
      })
      .then(this.supabase.handleResponse);

    return member;
  }

  async updateMember(
    {
      id,
      full_name,
      member_type,
      training_level,
      busy_commissioning_id,
      subscribed_to_telegram_revenue_notifications,
      hidden,
    }: UpdateMemberDto,
    author: AuthenticatedUser,
  ) {
    await author.validate();

    const member = this.requireRow(
      await this.supabase.adminClient
        .from('members')
        .update({
          member_type,
          training_level,
          busy_commissioning_id,
          subscribed_to_telegram_revenue_notifications,
          hidden,
        })
        .eq('id', id)
        .select('id, account:accounts(id, supabase_id, organization_id)')
        .single()
        .then(this.supabase.handleResponse),
      'updateMember',
    );

    const account = member.account as unknown as AccountEmbed;
    const user_metadata: SupabaseUserMetadata = { full_name: full_name.trim() };
    const app_metadata: Partial<SupabaseAppMetadata> = { member_type };
    await this.supabase.adminClient.auth.admin
      .updateUserById(account.supabase_id, { user_metadata, app_metadata })
      .then(res => this.handleUserResponse(res));

    const message = `${ author.full_name } made updates to member ${ full_name }`;
    void this.supabase.adminClient
      .from('audits')
      .insert({
        message,
        author_id: author.account_id,
        organization_id: account.organization_id,
        member_id: member.id,
      })
      .then(this.supabase.handleResponse);

    return member;
  }

  async createAgent(
    { phone, email, full_name, grid_id }: CreateAgentDto,
    author: AuthenticatedUser,
  ) {
    await author.validate();

    const grid = this.requireRow(
      await this.supabase.adminClient
        .from('grids')
        .select('organization_id')
        .eq('id', grid_id)
        .single()
        .then(this.supabase.handleResponse),
      'createAgent grid',
    );
    const { organization_id } = grid;

    const user_metadata: SupabaseUserMetadata = { full_name: full_name.trim() };
    const user = await this.supabase.adminClient.auth.admin
      .createUser({
        phone,
        email,
        phone_confirm: true,
        email_confirm: true,
        user_metadata,
      })
      .then(res => this.handleUserResponse(res));

    const account = this.requireRow(
      await this.supabase.adminClient
        .from('accounts')
        .select('id')
        .eq('supabase_id', user.id)
        .single()
        .then(this.supabase.handleResponse),
      'createAgent account',
    );

    const app_metadata: SupabaseAppMetadata = {
      account_id: account.id,
      account_type: 'AGENT',
      organization_id,
      grid_id,
    };
    void this.supabase.adminClient.auth.admin.updateUserById(user.id, {
      app_metadata,
    });

    const agent = this.requireRow(
      await this.supabase.adminClient
        .from('agents')
        .insert({
          account_id: account.id,
          grid_id,
        })
        .select()
        .single()
        .then(this.supabase.handleResponse),
      'createAgent agent',
    );

    await this.supabase.adminClient
      .from('wallets')
      .insert({ agent_id: agent.id })
      .then(this.supabase.handleResponse);

    const message = `${ author.full_name } created a new agent ${ full_name }`;
    void this.supabase.adminClient
      .from('audits')
      .insert({
        message,
        author_id: author.account_id,
        organization_id,
        grid_id,
        agent_id: agent.id,
      })
      .then(this.supabase.handleResponse);

    return agent;
  }

  async updateAgent(
    { id, full_name, phone, email }: UpdateAgentDto,
    author: AuthenticatedUser,
  ) {
    await author.validate();

    const agent = this.requireRow(
      await this.supabase.adminClient
        .from('agents')
        .select('id, account:accounts(id, supabase_id, organization_id), grid_id')
        .eq('id', id)
        .single()
        .then(this.supabase.handleResponse),
      'updateAgent',
    );

    const account = agent.account as unknown as AccountEmbed;
    const user_metadata: SupabaseUserMetadata = { full_name: full_name.trim() };
    await this.supabase.adminClient.auth.admin
      .updateUserById(account.supabase_id, { phone, email, user_metadata })
      .then(res => this.handleUserResponse(res));

    const message = `${ author.full_name } updated agent ${ full_name }`;
    void this.supabase.adminClient
      .from('audits')
      .insert({
        message,
        author_id: author.account_id,
        organization_id: account.organization_id,
        grid_id: agent.grid_id,
        agent_id: agent.id,
      })
      .then(this.supabase.handleResponse);

    return agent;
  }

  async createCustomer(
    createCustomerInput: CreateCustomerDto,
    author: AuthenticatedUser,
  ) {
    await author.validate();

    const { full_name, phone, email, grid_id } = createCustomerInput;
    // Many customers cannot provide contact details — synthesize an email so Auth can create the user.
    const resolvedEmail = email ? email : phone ? undefined : `${ randomUUID() }@gmail.com`;

    const grid = this.requireRow(
      await this.supabase.adminClient
        .from('grids')
        .select('organization_id')
        .eq('id', grid_id)
        .single()
        .then(this.supabase.handleResponse),
      'createCustomer grid',
    );
    const { organization_id } = grid;

    const user_metadata: SupabaseUserMetadata = { full_name: full_name.trim() };
    const user = await this.supabase.adminClient.auth.admin
      .createUser({
        phone,
        email: resolvedEmail,
        phone_confirm: true,
        email_confirm: true,
        user_metadata,
      })
      .then(res => this.handleUserResponse(res));

    const account = this.requireRow(
      await this.supabase.adminClient
        .from('accounts')
        .select('id')
        .eq('supabase_id', user.id)
        .single()
        .then(this.supabase.handleResponse),
      'createCustomer account',
    );

    const app_metadata: SupabaseAppMetadata = {
      account_id: account.id,
      account_type: 'CUSTOMER',
      organization_id,
      grid_id,
    };
    void this.supabase.adminClient.auth.admin.updateUserById(user.id, {
      app_metadata,
    });

    const customer = this.requireRow(
      await this.supabase.adminClient
        .from('customers')
        .insert({
          account_id: account.id,
          grid_id,
          ...pick([
            'latitude',
            'longitude',
            'is_hidden_from_reporting',
            'lives_primarily_in_the_community',
            'generator_owned',
            'gender',
            'total_connection_fee',
          ], createCustomerInput),
        })
        .select('*, account:accounts(*)')
        .single()
        .then(this.supabase.handleResponse),
      'createCustomer customer',
    );

    const message = `${ author.full_name } created a new customer ${ full_name }`;
    void this.supabase.adminClient
      .from('audits')
      .insert({
        message,
        author_id: author.account_id,
        organization_id,
        grid_id,
        customer_id: customer.id,
      })
      .then(this.supabase.handleResponse);

    return customer;
  }

  async updateCustomer(
    {
      id,
      full_name,
      phone,
      email,
      latitude,
      longitude,
      is_hidden_from_reporting,
    }: UpdateCustomerDto,
    author: AuthenticatedUser,
  ) {
    await author.validate();

    const customer = this.requireRow(
      await this.supabase.adminClient
        .from('customers')
        .update({ latitude, longitude, is_hidden_from_reporting })
        .eq('id', id)
        .select('id, grid_id, account:accounts(id, supabase_id, organization_id)')
        .single()
        .then(this.supabase.handleResponse),
      'updateCustomer',
    );

    const account = customer.account as unknown as AccountEmbed;
    const user_metadata: SupabaseUserMetadata = { full_name: full_name.trim() };
    await this.supabase.adminClient.auth.admin
      .updateUserById(account.supabase_id, { phone, email, user_metadata })
      .then(res => this.handleUserResponse(res));

    const message = `${ author.full_name } updated customer ${ full_name }`;
    void this.supabase.adminClient
      .from('audits')
      .insert({
        message,
        author_id: author.account_id,
        organization_id: account.organization_id,
        grid_id: customer.grid_id,
        customer_id: customer.id,
      })
      .then(this.supabase.handleResponse);

    return customer;
  }

  /** Soft-deletes the linked account and bans the Auth user. `id` is member/agent/customer id. */
  async deleteAccount(
    id: number,
    accountType: AccountTypeEnum,
    author: AuthenticatedUser,
  ) {
    await author.validate();

    const table =
      accountType === 'AGENT'
        ? 'agents'
        : accountType === 'CUSTOMER'
          ? 'customers'
          : accountType === 'MEMBER'
            ? 'members'
            : null;

    if (!table) {
      throw new Error(`Unsupported account type for delete: ${ accountType }`);
    }

    const hasGrid = table === 'agents' || table === 'customers';

    const row = this.requireRow(
      await this.supabase.adminClient
        .from(table)
        .select(hasGrid ? 'account_id, grid_id' : 'account_id')
        .eq('id', id)
        .single()
        .then(this.supabase.handleResponse),
      'deleteAccount entity',
    ) as {
      account_id: number;
      grid_id?: number | null;
    };

    const { account_id, grid_id } = row;

    const account = this.requireRow(
      await this.supabase.adminClient
        .from('accounts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', account_id)
        .select('supabase_id, full_name, organization_id')
        .single()
        .then(this.supabase.handleResponse),
      'deleteAccount account',
    );

    if (!account.supabase_id) {
      throw new NotFoundException('deleteAccount: account has no supabase_id');
    }

    await this.supabase.adminClient.auth.admin
      .updateUserById(account.supabase_id, { ban_duration: '876000h' })
      .then(res => this.handleUserResponse(res));

    const entity = table.slice(0, -1);
    const message = `${ author.full_name } deleted ${ entity } ${ account.full_name }`;
    const entityIdField =
      accountType === 'AGENT'
        ? { agent_id: id }
        : accountType === 'CUSTOMER'
          ? { customer_id: id }
          : accountType === 'MEMBER'
            ? { member_id: id }
            : {};

    void this.supabase.adminClient
      .from('audits')
      .insert({
        message,
        author_id: author.account_id,
        organization_id: account.organization_id,
        grid_id,
        ...entityIdField,
      })
      .then(this.supabase.handleResponse);

    return { accountType, full_name: account.full_name, deleted: true };
  }
}
