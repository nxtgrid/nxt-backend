import moment from 'moment';
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SupabaseService } from '../supabase.module';
import { toSafeNumberOrZero } from '@helpers/number-helpers';

type SpendingQueryOptions = {
  start: moment.Moment;
  end: moment.Moment;
  limit?: number;
}

@Injectable()
export class SpendingService {
  constructor(
    private readonly postgres: DataSource,
    private readonly supabaseService: SupabaseService,
  ) {}

  findEnergyTopupRevenue(grid_id: number, { start, end }: SpendingQueryOptions) {
    return this.supabaseService.adminClient
      .rpc('find_energy_topup_revenue', {
        grid_id,
        start_date: start.toISOString(),
        end_date: end.toISOString(),
      })
      .then(this.supabaseService.handleResponse)
    ;
  }

  // TODO: this should be pointing to historical orders
  findTopSpenders(grid_id: number, { start, end, limit = 3 }: SpendingQueryOptions) {
    return this.supabaseService.adminClient
      .rpc('find_top_spenders', {
        grid_id,
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        limit_count: limit,
      })
      .then(this.supabaseService.handleResponse)
    ;
  }

  async findConnectionFeeRevenue(gridId: number, { start, end }: SpendingQueryOptions): Promise<number> {
    const query = `
      SELECT
        SUM(
          CASE
            WHEN meta_order_type = $1 THEN amount
            WHEN meta_order_type = $2 THEN -amount
            ELSE 0
          END
        ) AS revenue
      FROM orders
      WHERE historical_grid_id = $3
        AND order_status = $4
        AND meta_order_type IN ($5, $6)
        AND created_at >= $7
        AND created_at < $8
    `;

    const params = [
      'CONNECTION_PAYMENT',
      'CONNECTION_REFUND',
      gridId,
      'COMPLETED',
      'CONNECTION_PAYMENT',
      'CONNECTION_REFUND',
      start.format('YYYY-MM-DD HH:mm:ss'),
      end.format('YYYY-MM-DD HH:mm:ss'),
    ];

    const res = await this.postgres.query(query, params);
    return toSafeNumberOrZero(res[0]?.revenue);
  }
}
