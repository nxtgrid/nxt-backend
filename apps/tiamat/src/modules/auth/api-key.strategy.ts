import { HeaderAPIKeyStrategy } from 'passport-headerapikey';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ApiKeysService } from '@core/modules/api-keys/api-keys.service';
import { ApiKey } from '@core/modules/api-keys/entities/api-key.entity';
import { NxtSupabaseUser } from './nxt-supabase-user';
import { NXT_ORG_ID } from '@core/constants';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(HeaderAPIKeyStrategy) {
  constructor(private readonly apiKeysService: ApiKeysService) {
    super({ header: 'X-API-KEY', prefix: '' }, false);
  }

  public validate = async (apiKey: string): Promise<NxtSupabaseUser> => {
    const key: ApiKey = await this.apiKeysService.findByKeyAndIsLocked(apiKey, false);
    if (!key?.account || key.account.deleted_at)
      throw new UnauthorizedException('The API key used does not have a corresponding account');

    const {
      id,
      full_name,
      email,
      member: { member_type },
      organization,
      supabase_id,
    } = key.account;

    return {
      email,
      full_name,
      account_type: 'MEMBER',
      member_type,
      account_id: id,
      organization_id: organization.id,
      is_nxt_grid_member: organization.id === NXT_ORG_ID,
      supabase_id,
      account: key.account,
      async validate() { return {}; }, // Fake validation method
    };
  };
}
