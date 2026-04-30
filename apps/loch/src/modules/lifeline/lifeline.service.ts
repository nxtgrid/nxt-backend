import moment from 'moment';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from '@core/modules/supabase.module';
import { partition } from 'ramda';
import { RAW_QUERIES, LifelineConnectionConsumption, LifelineConnectionConsumptionParams } from '@loch/queries';
import { toSafeNumberOrZero } from '@helpers/number-helpers';

@Injectable()
export class LifelineService {
  isRecalculatingLifelineConnections = false;

  constructor(
    @InjectDataSource('timescale')
    protected readonly timescale: DataSource,
    private readonly supabaseService: SupabaseService,
  ) { }

  @Cron(CronExpression.EVERY_DAY_AT_5AM, { disabled: process.env.NXT_ENV !== 'production' })
  async recalculateLifelineConnections() {
    if (this.isRecalculatingLifelineConnections) return;
    this.isRecalculatingLifelineConnections = true;

    const { adminClient: supabase, handleResponse } = this.supabaseService;

    try {
      const grids = await supabase
        .from('grids')
        .select('id, lifeline_connection_days_threshold, lifeline_connection_kwh_threshold')
        .is('deleted_at', null)
        .is('is_hidden_from_reporting', false)
        .then(handleResponse)
      ;
      for (const grid of grids) {
        // At every iteration we fetch the parameters at grid level
        const end = moment().startOf('day');
        const start = moment(end).subtract(grid.lifeline_connection_days_threshold, 'days');

        const connectionIds = await supabase
          .from('connections')
          .select(`
            id,
            customer:customers!inner(
              account:accounts!inner()
            )
          `)
          .eq('customer.grid_id', grid.id)
          .is('deleted_at', null)
          .is('customer.is_hidden_from_reporting', false)
          .is('customer.account.deleted_at', null)
          .then(handleResponse)
          .then(_connections => _connections.map(({ id }) => id))
        ;
        await this.processConnections(connectionIds, grid.lifeline_connection_kwh_threshold, start, end);
      }
    }
    catch (err) {
      console.error(err);
    }
    finally {
      this.isRecalculatingLifelineConnections = false;
    }
  }

  async processConnections(connectionIds: number[], kwhThreshold: number, start: moment.Moment, end: moment.Moment) {
    // Fetch all connection groups, independently of whether they are or not lifeline
    const params: LifelineConnectionConsumptionParams = [
      start.format('YYYY-MM-DD HH:mm:ss'),
      end.format('YYYY-MM-DD HH:mm:ss'),
      0,
      5, // To remove bad data from calin
      connectionIds,
    ];
    const result: LifelineConnectionConsumption[] = await this.timescale.query(
      RAW_QUERIES.sql.timescale.lifeline.findLifelineConnections,
      params,
    );

    // Make sure that the rows all contain numbers
    const connectionsToUpdate = connectionIds.map(id => {
      const row = result.find(({ connection_id }) => connection_id === id);
      if (!row) return { id, is_lifeline: null };

      return {
        id,
        is_lifeline: toSafeNumberOrZero(row.total_consumption_kwh) < kwhThreshold,
      };
    });

    const { handleResponse, adminClient: supabase } = this.supabaseService;
    const [ lifelineConnections, nonLifelineConnections ] = partition(({ is_lifeline }) => is_lifeline, connectionsToUpdate);

    // We partition into two two arrays to make it easier to update the connections in a single query
    await supabase
      .from('connections')
      .update({ is_lifeline: true })
      .in('id', lifelineConnections.map(({ id }) => id))
      .then(handleResponse)
    ;

    await supabase
      .from('connections')
      .update({ is_lifeline: false })
      .in('id', nonLifelineConnections.map(({ id }) => id))
      .then(handleResponse)
    ;
  }
}
