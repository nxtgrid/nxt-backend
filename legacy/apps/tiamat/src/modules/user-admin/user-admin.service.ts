import { Injectable } from '@nestjs/common';
import { pick } from 'ramda';
import { v4 as uuidv4 } from 'uuid';
import { SupabaseService, throwSupabaseError } from '@core/modules/supabase.module';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { CreateCustomerDto } from '@core/modules/customers/dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { NxtSupabaseUser } from '../auth/nxt-supabase-user';
import { AccountTypeEnum, MemberTypeEnum } from '@core/types/supabase-types';
import { UserResponse } from '@supabase/supabase-js';

export interface SupabaseUserMetadata {
  full_name: string
}

export interface SupabaseAppMetadata {
  account_id: number
  account_type: AccountTypeEnum
  member_type?: MemberTypeEnum
  organization_id: number
  grid_id?: number
}

const handleUserResponse = (res: UserResponse) => {
  const { data, error } = res;
  if (error) {
    console.error('error handling User Admin', res);
    throwSupabaseError(error);
  }
  return data.user;
};

@Injectable()
export class UserAdminService {
  constructor(private readonly supabase: SupabaseService) {
    // const password = 'PASSWORD';

    // Superadmin
    // this.createTestUser({ email: 'bobby.bol@nxtgrid.co', full_name: 'Bobby Bol', organization_id: 2, member_type: MemberType.SUPERADMIN, password });
    // Developer
    // this.createTestUser({ email: 'bobby.bol+developer@nxtgrid.co', full_name: 'Bobby Bol Developer', organization_id: 9, member_type: MemberType.DEVELOPER, password });
    // Tech
    // this.createTestUser({ email: 'bobby.bol+tech@nxtgrid.co', full_name: 'Bobby Bol Tech', organization_id: 9, member_type: MemberType.TECH, password });
    // Agent
    // this.createTestUser({ isAgent: true, email: 'bobby.bol+agent3@nxtgrid.co', phone: '+31622748374', full_name: 'Bobby Bol Agent', grid_id: 5, password });
  }

  // async createTestUser(options) {
  //   if(process.env.NXT_ENV === 'production') return;
  //   const { email, phone, full_name, password, member_type, organization_id, grid_id, isAgent } = options;

  //   let account_id;

  //   if(isAgent) {
  //     const agent = await this.createAgent({ phone, email, full_name, grid_id });
  //     account_id = agent.account_id;
  //   }
  //   else {
  //     const member = await this.inviteMember({
  //       email,
  //       full_name,
  //       organization_id,
  //       member_type,
  //       redirectTo: '',
  //     });
  //     account_id = member.account_id;
  //   }

  //   const [ account ] = await this.supabase.adminClient
  //     .from('accounts')
  //     .select('supabase_id')
  //     .eq('id', account_id)
  //     .then(this.supabase.handleResponse)
  //   ;

  //   await this.supabase.adminClient.auth.admin.updateUserById(account.supabase_id, {
  //     password,
  //     email_confirm: true,
  //     phone_confirm: true,
  //   });
  // }

  async inviteMember({
    email,
    redirectTo,
    full_name,
    organization_id,
    member_type,
    busy_commissioning_id,
  }: InviteMemberDto, author: NxtSupabaseUser) {
    // 0) Since we're going to use the admin client, we want to validate the authoring user
    await author.validate();

    // 1) Create a Supabase user which also creates an account
    const user_metadata: SupabaseUserMetadata = { full_name: full_name.trim() };
    const user = await this.supabase.adminClient.auth.admin
      .inviteUserByEmail(email, { data: user_metadata, redirectTo })
      .then(handleUserResponse)
    ;

    // 2 Fetch the automatically created account
    const account = await this.supabase.adminClient
      .from('accounts')
      .select('id')
      .eq('supabase_id', user.id)
      .single()
      .then(this.supabase.handleResponse)
    ;

    // 3) Now we have to update the Supabase user to store some ACL RLS properties
    const app_metadata: SupabaseAppMetadata = {
      account_id: account.id,
      account_type: 'MEMBER',
      member_type,
      organization_id,
    };
    await this.supabase.adminClient.auth.admin
      .updateUserById(user.id, { app_metadata })
      .then(handleUserResponse)
    ;

    // 4) Create a NXT Grid member tied to that account
    const member = await this.supabase.adminClient
      .from('members')
      .insert({
        account_id: account.id,
        member_type,
        busy_commissioning_id,
      })
      .select()
      .single()
      .then(this.supabase.handleResponse)
    ;

    // 5) Create audit
    const message = `${ author.full_name } invited a new member ${ full_name } (${ email }) with ${ member_type } role`;
    this.supabase.adminClient
      .from('audits')
      .insert({
        message,
        author_id: author.account_id,
        organization_id,
        member_id: member.id,
      })
      .then(this.supabase.handleResponse)
    ;

    return member;
  }

  async updateMember({
    id,
    full_name,
    member_type,
    training_level,
    busy_commissioning_id,
    subscribed_to_telegram_revenue_notifications,
    hidden,
  }: UpdateMemberDto, author: NxtSupabaseUser) {
    // 0) Since we're going to use the admin client, we want to validate the authoring user
    await author.validate();

    // 1) Update and get the member with account
    const member = await this.supabase.adminClient
      .from('members')
      .update({ member_type, training_level, busy_commissioning_id, subscribed_to_telegram_revenue_notifications, hidden })
      .eq('id', id)
      .select('id, account:accounts(id, supabase_id, organization_id)')
      .single()
      .then(this.supabase.handleResponse)
    ;

    // 2) Update the Supabase User (which automatically updates account too)
    const user_metadata: SupabaseUserMetadata = { full_name: full_name.trim() };
    const app_metadata: Partial<SupabaseAppMetadata> = { member_type };
    await this.supabase.adminClient.auth.admin
      .updateUserById(member.account.supabase_id, { user_metadata, app_metadata })
      .then(handleUserResponse)
    ;

    // 3) Create audit
    const message = `${ author.full_name } made updates to member ${ full_name }`;
    this.supabase.adminClient
      .from('audits')
      .insert({
        message,
        author_id: author.account_id,
        organization_id: member.account.organization_id,
        member_id: member.id,
      })
      .then(this.supabase.handleResponse)
    ;

    return member;
  }

  async createAgent({ phone, email, full_name, grid_id }: CreateAgentDto, author: NxtSupabaseUser) {
    // 0) Since we're going to use the admin client, we want to validate the authoring user
    await author.validate();

    // 1) We create agents for grids but we need organization_id for RLS
    const { organization_id } = await this.supabase.adminClient
      .from('grids')
      .select('organization_id')
      .eq('id', grid_id)
      .single()
      .then(this.supabase.handleResponse)
    ;

    // 2) Create a Supabase user which also creates an account
    const user_metadata: SupabaseUserMetadata = { full_name: full_name.trim() };
    const user = await this.supabase.adminClient.auth.admin
      .createUser({
        phone,
        email,
        phone_confirm: true,
        email_confirm: true,
        user_metadata,
      })
      .then(handleUserResponse)
    ;

    // 3) Fetch the automatically created account
    const account = await this.supabase.adminClient
      .from('accounts')
      .select('id')
      .eq('supabase_id', user.id)
      .single()
      .then(this.supabase.handleResponse)
    ;

    // 4) Now we have to update the Supabase user to store some ACL RLS properties
    const app_metadata: SupabaseAppMetadata = {
      account_id: account.id,
      account_type: 'AGENT',
      organization_id,
      grid_id,
    };
    this.supabase.adminClient.auth.admin
      .updateUserById(user.id, { app_metadata })
    ;

    // 5) Create an Agent tied to that account
    const agent = await this.supabase.adminClient
      .from('agents')
      .insert({
        account_id: account.id,
        grid_id,
      })
      .select()
      .single()
      .then(this.supabase.handleResponse)
    ;

    // 6) Create a Wallet for the agent
    await this.supabase.adminClient
      .from('wallets')
      .insert({ agent_id: agent.id })
      .then(this.supabase.handleResponse)
    ;

    // 7) Create audit
    const message = `${ author.full_name } created a new agent ${ full_name }`;
    this.supabase.adminClient
      .from('audits')
      .insert({
        message,
        author_id: author.account_id,
        organization_id,
        grid_id,
        agent_id: agent.id,
      })
      .then(this.supabase.handleResponse)
    ;

    return agent;
  }

  async updateAgent({ id, full_name, phone, email }: UpdateAgentDto, author: NxtSupabaseUser) {
    // 0) Since we're going to use the admin client, we want to validate the authoring user
    await author.validate();

    // 1) Get the agent for some extra properties
    const agent = await this.supabase.adminClient
      .from('agents')
      .select('id, account:accounts(id, supabase_id, organization_id), grid_id')
      .eq('id', id)
      .single()
      .then(this.supabase.handleResponse)
    ;

    // 2) Do the actual update
    const user_metadata: SupabaseUserMetadata = { full_name: full_name.trim() };
    await this.supabase.adminClient.auth.admin
      .updateUserById(agent.account.supabase_id, { phone, email, user_metadata })
      .then(handleUserResponse)
    ;

    // 3) Create audit
    const message = `${ author.full_name } updated agent ${ full_name }`;
    this.supabase.adminClient
      .from('audits')
      .insert({
        message,
        author_id: author.account_id,
        organization_id: agent.account.organization_id,
        grid_id: agent.grid_id,
        agent_id: agent.id,
      })
      .then(this.supabase.handleResponse)
    ;

    return agent;
  }

  async createCustomer(createCustomerInput: CreateCustomerDto, author: NxtSupabaseUser) {
    // 0) Since we're going to use the admin client, we want to validate the authoring user
    await author.validate();

    const { full_name, phone, email, grid_id } = createCustomerInput;
    // If no email or phone number is passed (many customers can't provide a phone number),
    // we make a fake email instead so we can still create the account
    const _email = email ? email : phone ? undefined : `${ uuidv4() }@gmail.com`;

    // 1) We create customers for grids but we need organization_id for RLS
    const { organization_id } = await this.supabase.adminClient
      .from('grids')
      .select('organization_id')
      .eq('id', grid_id)
      .single()
      .then(this.supabase.handleResponse)
    ;

    // 2) Create a Supabase user which also creates an account
    const user_metadata: SupabaseUserMetadata = { full_name: full_name.trim() };
    const user = await this.supabase.adminClient.auth.admin
      .createUser({
        phone,
        email: _email,
        phone_confirm: true,
        email_confirm: true,
        user_metadata,
      })
      .then(handleUserResponse)
    ;

    // 3) Fetch the automatically created account
    const account = await this.supabase.adminClient
      .from('accounts')
      .select('id')
      .eq('supabase_id', user.id)
      .single()
      .then(this.supabase.handleResponse)
    ;

    // 4) Now we have to update the Supabase user to store some ACL RLS properties
    const app_metadata: SupabaseAppMetadata = {
      account_id: account.id,
      account_type: 'CUSTOMER',
      organization_id,
      grid_id,
    };
    this.supabase.adminClient.auth.admin
      .updateUserById(user.id, { app_metadata })
    ;

    // 5) Create a customer tied to that account
    const customer = await this.supabase.adminClient
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
      .then(this.supabase.handleResponse)
    ;

    // 6) Create audit
    const message = `${ author.full_name } created a new customer ${ full_name }`;
    this.supabase.adminClient
      .from('audits')
      .insert({
        message,
        author_id: author.account_id,
        organization_id,
        grid_id,
        customer_id: customer.id,
      })
      .then(this.supabase.handleResponse)
    ;

    return customer;
  }

  async updateCustomer({
    id,
    full_name,
    phone,
    email,
    latitude,
    longitude,
    is_hidden_from_reporting,
  }: UpdateCustomerDto, author: NxtSupabaseUser) {
    // 0) Since we're going to use the admin client, we want to validate the authoring user
    await author.validate();

    // 1) Update and get the customer with account
    const customer = await this.supabase.adminClient
      .from('customers')
      .update({ latitude, longitude, is_hidden_from_reporting })
      .eq('id', id)
      .select('id, grid_id, account:accounts(id, supabase_id, organization_id)')
      .single()
      .then(this.supabase.handleResponse)
    ;

    // 2) Update the Supabase User (which automatically updates account too)
    const user_metadata: SupabaseUserMetadata = { full_name: full_name.trim() };
    await this.supabase.adminClient.auth.admin
      .updateUserById(customer.account.supabase_id, { phone, email, user_metadata })
      .then(handleUserResponse)
    ;

    // 3) Create audit
    const message = `${ author.full_name } updated customer ${ full_name }`;
    this.supabase.adminClient
      .from('audits')
      .insert({
        message,
        author_id: author.account_id,
        organization_id: customer.account.organization_id,
        grid_id: customer.grid_id,
        customer_id: customer.id,
      })
      .then(this.supabase.handleResponse)
    ;

    return customer;
  }

  // The ID passed here is the agent, customer, or member ID
  async deleteAccount(id: number, accountType: AccountTypeEnum, author: NxtSupabaseUser) {
    // 0) Since we're going to use the admin client, we want to validate the authoring user
    await author.validate();

    const table =
      accountType === 'AGENT' ? 'agents' :
        accountType === 'CUSTOMER' ? 'customers' :
          accountType === 'MEMBER' ? 'members' :
            null;

    const hasGrid = [ 'agents', 'customers' ].includes(table);

    // 1) Get appropriate account_id
    const { account_id, grid_id } = await this.supabase.adminClient
      .from(table)
      .select(`account_id ${ hasGrid ? ', grid_id' : '' }`)
      .eq('id', id)
      .single()
      .then(this.supabase.handleResponse) as {
        account_id: number;
        grid_id?: number | null;
      }
    ;

    // 3) Soft delete the account
    const { supabase_id, full_name, organization_id } = await this.supabase.adminClient
      .from('accounts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', account_id)
      .select('supabase_id, full_name, organization_id')
      .single()
      .then(this.supabase.handleResponse)
    ;

    // 4) Ban the Supabase user for a 100 years
    await this.supabase.adminClient.auth.admin
      .updateUserById(supabase_id, { ban_duration: '876000h' })
      .then(handleUserResponse)
    ;

    const entity = table.slice(0, -1);

    // 5) Create audit
    const message = `${ author.full_name } deleted ${ entity } ${ full_name }`;
    const entityIdField =
      accountType === 'AGENT' ? { agent_id: id } :
        accountType === 'CUSTOMER' ? { customer_id: id } :
          accountType === 'MEMBER' ? { member_id: id } :
            {};
    this.supabase.adminClient
      .from('audits')
      .insert({
        message,
        author_id: author.account_id,
        organization_id,
        grid_id,
        ...entityIdField,
      })
      .then(this.supabase.handleResponse)
    ;

    return { accountType, full_name, deleted: true };
  }
}
