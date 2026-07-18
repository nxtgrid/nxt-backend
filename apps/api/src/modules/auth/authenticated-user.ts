import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { PostgrestError, SupabaseClient, User } from '@supabase/supabase-js';
import type {
  AccountTypeEnum,
  MemberTypeEnum,
} from '@nxt/core/types/supabase-types';
import type { Database } from '@nxt/core/types/supabase-types-adjusted';

/**
 * Principal attached by Passport after bearer or API-key validation.
 * No embedded account row (legacy TEMPORARY attach dropped); use `account_id` / claims.
 */
export interface AuthenticatedUser {
  email: string;
  full_name: string;
  account_type: AccountTypeEnum;
  member_type: MemberTypeEnum;
  account_id: number;
  organization_id: number;
  supabase_id: string;
  /** Per-request user client (RLS). Absent on API-key auth until a user client is wired. */
  supabase?: {
    client: SupabaseClient<Database>;
    handleResponse<T>({
      data,
      error,
      status,
    }: {
      data: T;
      error: PostgrestError | null;
      status: number;
    }): T;
  };
  /**
   * Re-checks the session with Supabase Auth when a user client is present.
   * API-key path may stub this until a privileged equivalent exists.
   */
  validate(args?: { organization_id?: number }): Promise<User | Record<string, never>>;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    return context.switchToHttp().getRequest<{ user: AuthenticatedUser }>().user;
  },
);
