import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Account } from '@core/modules/accounts/entities/account.entity';
import { SupabaseClient, PostgrestError } from '@supabase/supabase-js';
import { AccountTypeEnum, Database, MemberTypeEnum } from '@core/types/supabase-types';

export interface NxtSupabaseUser {
  email: string;
  full_name: string;
  account_type: AccountTypeEnum;
  member_type: MemberTypeEnum;
  account_id: number;
  organization_id: number;
  is_nxt_grid_member: boolean;
  supabase_id: string;
  supabase?: {
    client: SupabaseClient<Database>
    handleResponse<T,>({ data, error, status }: { data: T, error: PostgrestError, status: number }): T
  }
  account?: Account
  validate(): any
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): NxtSupabaseUser => {
    return context.getArgs()[0].user;
  },
);
