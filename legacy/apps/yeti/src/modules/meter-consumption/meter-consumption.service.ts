import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface MeterConsumptionQuery {
  site?: string;
  siteId?: number;
  from: string;
  to: string;
  offset?: number;
}

interface MeterConsumptionReading {
  timestamp: string;
  meterId: string;
  energyConsumptionKwh: number;
  timeIntervalMinutes: number;
  customerAccountId: number;
}

interface MeterConsumptionResponse {
  readings: MeterConsumptionReading[];
  offset: number;
  pageLimit: number;
  total: number;
}

const PAGE_LIMIT = 500;

@Injectable()
export class MeterConsumptionService {
  constructor(
    @InjectDataSource('timescale')
    private readonly timescale: DataSource,
  ) { }

  async getConsumption(query: MeterConsumptionQuery): Promise<MeterConsumptionResponse> {
    const { from, to } = query;
    const offset = query.offset ?? 0;

    // site_id (grid_id) takes precedence over site (grid_name)
    const siteFilter = query.siteId !== undefined
      ? 'AND grid_id = $3'
      : 'AND LOWER(grid_name) = LOWER($3)';
    const siteParam = query.siteId !== undefined ? query.siteId : query.site;

    const whereClause = `
      WHERE created_at >= $1
        AND created_at <= $2
        ${ siteFilter }
        AND is_hidden_from_reporting = false
        AND consumption_kwh IS NOT NULL
        AND consumption_kwh != 'NaN'::float8
    `;

    const countSql = `SELECT COUNT(*)::int as total FROM meter_snapshot_1_h ${ whereClause }`;
    const countResult = await this.timescale.query(countSql, [ from, to, siteParam ]);
    const total: number = countResult[0].total;

    const dataSql = `
      SELECT
        created_at,
        meter_external_reference,
        COALESCE(consumption_kwh, 0) as consumption_kwh,
        customer_id
      FROM meter_snapshot_1_h
      ${ whereClause }
      ORDER BY created_at, meter_id
      LIMIT $4 OFFSET $5
    `;

    const rows: any[] = await this.timescale.query(dataSql, [ from, to, siteParam, PAGE_LIMIT, offset ]);

    const readings: MeterConsumptionReading[] = rows.map(row => ({
      timestamp: row.created_at,
      meterId: row.meter_external_reference,
      energyConsumptionKwh: Math.round(parseFloat(row.consumption_kwh) * 1000) / 1000,
      timeIntervalMinutes: 60,
      customerAccountId: row.customer_id,
    }));

    return { readings, offset, pageLimit: PAGE_LIMIT, total };
  }
}
