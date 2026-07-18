import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import throttle from 'lodash.throttle';
import moment from 'moment';
import { SupabaseService } from '@core/modules/supabase.module';
import { PgService } from '@core/modules/core-pg';
import { BatchExecutionStatusCounts, BatchExecutionStatusCountsParams, RAW_QUERIES } from '@tiamat/queries';
import {
  pendingStatuses,
  processingStatuses,
  successfulStatuses,
  failedStatuses,
} from '@tiamat/modules/meter-interactions/lib/meter-interaction-status-helpers';

const FS_DELIVERY_CONSIDERED_SUCCESSFUL_THRESHOLD = 0.5;
const THROTTLE_WINDOW_MS = 5000;
const CLEANUP_AFTER_MS = 60000;

interface ThrottledRecalc {
  (id: number): void;
  cancel(): void;
  flush(): void;
}

@Injectable()
export class DirectiveBatchExecutionsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly pgService: PgService,
  ) {
    // setTimeout(() => {
    //   this._doReconciliation();
    // }, 10000);
  }

  private throttlers = new Map<number, ThrottledRecalc>();
  private cleanupTimers = new Map<number, NodeJS.Timeout>();

  async recalculateDeliveryPercentage(id: number) {
    let _throttledFn = this.throttlers.get(id);

    // 1. Create the throttler if it doesn't exist
    if (!_throttledFn) {
      _throttledFn = throttle(
        async (batchId: number) => {
          try {
            await this._recalculateDeliveryPercentage(batchId);
          }
          finally {
            // Once the work (including the trailing edge) is done,
            // schedule this throttler for retirement.
            this._scheduleCleanup(batchId);
          }
        },
        THROTTLE_WINDOW_MS,
        { leading: true, trailing: true },
      );

      this.throttlers.set(id, _throttledFn);
    }

    // 2. If a cleanup was planned, cancel it because we have fresh activity
    this._cancelCleanup(id);

    // 3. Fire the throttler (Lodash handles the timing internally)
    _throttledFn(id);
  }

  private async _recalculateDeliveryPercentage(id: number) {
    const { adminClient: supabase, handleResponse } = this.supabaseService;
    // console.info('[DIRECTIVE BATCH EXECUTIONS] Going to calculate delivery percentage for', id);

    try {
      const execution = await supabase
        .from('directive_batch_executions')
        .select(`
          id,
          total_count,
          qualified_at,
          directive_batch:directive_batches(
            fs_command,
            grid_id
          )
        `)
        .eq('id', id)
        .maybeSingle()
        .then(handleResponse)
      ;

      // This is in internal process, so no error throwing. Hence also the big try/catch
      if(!execution) return;

      // const queryStartTime = performance.now();
      const rows = await this.pgService.query<BatchExecutionStatusCounts>(
        RAW_QUERIES.sql.supabase.directiveBatchExecutions.countStatuses,
        [ id, pendingStatuses, processingStatuses, successfulStatuses, failedStatuses ] as BatchExecutionStatusCountsParams,
      );
      const counts = rows[0];
      // const queryDuration = Math.round(performance.now() - queryStartTime);
      // console.info(`[DIRECTIVE BATCH EXECUTIONS] Status count query took ${ queryDuration }ms for execution ${ id }`);

      const processed_count = counts.successful + counts.failed;
      const hasCompleted = processed_count >= execution.total_count;
      const successfulDeliveryProportion = execution.total_count ? counts.successful / execution.total_count : 0;
      const hasQualifiedWithThisDelivery = !execution.qualified_at                      // It's not already qualified
        && execution.directive_batch.fs_command                                         // It's an FS command
        && successfulDeliveryProportion >= FS_DELIVERY_CONSIDERED_SUCCESSFUL_THRESHOLD  // It has reached the threshold success rate
      ;
      const _now = (new Date()).toISOString();

      await supabase
        .from('directive_batch_executions')
        .update({
          processing_count: counts.processing,
          processed_count,
          pending_count: counts.pending,
          successful_count: counts.successful,
          failed_count: counts.failed,
          ...(hasQualifiedWithThisDelivery && { qualified_at: _now }),
          ...(hasCompleted && { completed_at: _now }),
        })
        .eq('id', execution.id)
        .then(handleResponse)
      ;

      // @SIDE-EFFECT :: If we qualified FS delivery we also change the state of the grid
      if(hasQualifiedWithThisDelivery) {
        // console.info(`[DIRECTIVE BATCH EXECUTIONS] Updating grid ${ execution.directive_batch.grid_id } to FS ${ execution.directive_batch.fs_command }`);
        await supabase
          .from('grids')
          .update({
            is_fs_on: execution.directive_batch.fs_command === 'ON',
            is_fs_on_updated_at: _now,
          })
          .eq('id', execution.directive_batch.grid_id)
          .then(handleResponse)
        ;
      }
    }
    catch(err) {
      console.error('[DIRECTIVE BATCH EXECUTIONS] Failed to calculate percentage', err);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_NOON, { disabled: process.env.NXT_ENV !== 'production' })
  public async doReconciliation() {
    const twelveHoursAgo = moment().subtract(12, 'hours').toISOString();

    const staleExecutions = await this.supabaseService.adminClient
      .from('directive_batch_executions')
      .select('id')
      .is('completed_at', null)
      .lt('created_at', twelveHoursAgo)
      .then(this.supabaseService.handleResponse)
    ;

    console.info(`
      ================================
      [DIRECTIVE BATCH RECONCILIATION]
         found ${ staleExecutions.length } stale executions
      ================================
    `);

    for(const { id } of staleExecutions) {
      // 1. Try to reconcile, in case we missed some events
      await this._recalculateDeliveryPercentage(id);
    }
    // 2. For executions older than a week, we should either
    //  a. Do deeper, per interaction reconciliation
    //  b. Just mark the final items as failed and close the thing

    return { staleExecutions };
  }

  private _scheduleCleanup(id: number): void {
    this._cancelCleanup(id); // Clear any existing timer first

    const timer = setTimeout(() => {
      this.throttlers.delete(id);
      this.cleanupTimers.delete(id);
    }, CLEANUP_AFTER_MS);

    this.cleanupTimers.set(id, timer);
  }

  private _cancelCleanup(id: number): void {
    if (this.cleanupTimers.has(id)) {
      clearTimeout(this.cleanupTimers.get(id));
      this.cleanupTimers.delete(id);
    }
  }

  // NestJS Lifecycle hook to prevent memory leaks on app shutdown/HMR
  onModuleDestroy() {
    this.cleanupTimers.forEach(timer => clearTimeout(timer));
    this.throttlers.forEach(fn => fn.cancel());
    this.cleanupTimers.clear();
    this.throttlers.clear();
  }
}
