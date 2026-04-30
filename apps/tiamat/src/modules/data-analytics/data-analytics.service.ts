import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RAW_QUERIES, GridUptimeDaily, GridUptimeDailyParams, TopConsumer, TopConsumerParams } from '@tiamat/queries';

@Injectable()
export class DataAnalyticsService {
  constructor(
    @InjectDataSource('timescale')
    protected readonly timescale: DataSource,
  ) { }

  async getGridUptimes(gridId: number): Promise<GridUptimeDaily[]> {
    const params: GridUptimeDailyParams = [ gridId ];
    return this.timescale.query(RAW_QUERIES.sql.timescale.dataAnalytics.getUptimes, params);
  }

  async getGridTopConsumers(gridId: number, options): Promise<TopConsumer[]> {
    const { start_date, end_date, limit_count = 3 } = options;
    const params: TopConsumerParams = [ gridId, start_date, end_date, limit_count ];
    return this.timescale.query(RAW_QUERIES.sql.timescale.dataAnalytics.getTopConsumers, params);
  }
}
