import { Injectable } from '@nestjs/common';
import { SupabaseService } from '@nxt/core';

@Injectable()
export class HealthService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getHealth(): Promise<{ status: 'ok' }> {
    await this.supabaseService.adminClient
      .from('organizations')
      .select('id')
      .limit(1)
      .then(response => this.supabaseService.handleResponse(response));

    return { status: 'ok' };
  }
}
