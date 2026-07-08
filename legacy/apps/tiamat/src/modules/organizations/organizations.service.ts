import { Injectable } from '@nestjs/common';
import { SupabaseService } from '@core/modules/supabase.module';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly supabaseService: SupabaseService,
  ) {}
  async findOne(id: number) {
    return this.supabaseService.adminClient
      .from('organizations')
      .select('*, wallet:wallets(*)')
      .eq('id', id)
      .maybeSingle()
      .then(this.supabaseService.handleResponse)
    ;
  }
}
