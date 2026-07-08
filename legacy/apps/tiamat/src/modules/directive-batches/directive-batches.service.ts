import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import moment from 'moment';
import { forceLeadingZero } from '@helpers/time-helpers';

// DTOs
import { UpsertDirectiveBatchDto } from './dto/UpsertDirectiveBatchDto';

// Services
import { SupabaseService } from '@core/modules/supabase.module';

// Types
import { MeterInteractionTypeEnum } from '@core/types/supabase-types';
import { NxtSupabaseUser } from '../auth/nxt-supabase-user';
import { CreateMeterInteractionDto } from '../meter-interactions/dto/create-meter-interaction.dto';
import { MeterInteractionsService } from '../meter-interactions/meter-interactions.service';

type BatchRuleToExecute = {
  id: number;
  fs_command: string;
  task_type: MeterInteractionTypeEnum;
  is_repeating: boolean
  grid: {
    id: number
    uses_dual_meter_setup: boolean
  }
}

@Injectable()
export class DirectiveBatchService {
  constructor(
    private readonly meterInteractionsService: MeterInteractionsService,
    private readonly supabaseService: SupabaseService,
  ) {}

  async upsertMany(directiveBatches: UpsertDirectiveBatchDto[], author: NxtSupabaseUser) {
    // @TEMPORARY :: Validate the user because we don't have all the proper RLS rules set to use author.supabase.client
    await author.validate();

    const updated_at = (new Date()).toISOString();
    const _rules = directiveBatches.map(rule => {
      // We do not update the author if the rule is deleted
      if(rule.is_deleted) return { ...rule, updated_at };
      return { ...rule, updated_at, author_id: author.account_id };
    });
    const savedRules = await this.supabaseService.adminClient
      .from('directive_batches')
      .upsert(_rules, { onConflict: 'id', defaultToNull: false })
      .select('id')
      .then(this.supabaseService.handleResponse)
    ;
    this.createAudits(directiveBatches, author);

    return savedRules;
  }

  async createAudits(directiveBatches: UpsertDirectiveBatchDto[], author: NxtSupabaseUser) {
    // @TODO :: Using adminClient but should be the author's client, but need to check RLS first
    // Fetching grid for some extra meta
    const { grid_id } = directiveBatches[0];
    const grid = await this.supabaseService.adminClient
      .from('grids')
      .select('name, organization_id')
      .eq('id', grid_id)
      .single()
      .then(this.supabaseService.handleResponse)
    ;

    directiveBatches.forEach(rule => {
      const theAuthor = author?.full_name ?? 'Unknown';
      const occurrence = rule.is_repeating ? 'every day' : 'once';
      const time = `${ forceLeadingZero(rule.hour) }:${ forceLeadingZero(rule.minute) }`;
      const schedulingAndLocation = `${ occurrence } at ${ time } in ${ grid.name }`;

      let message: string;
      if(rule.fs_command) {
        const action = !rule.id ? 'created a new' : rule.is_deleted ? 'deleted the' : 'updated a';
        const onOrOff = rule.fs_command === 'ON' ? 'on' : 'off';
        message = `${ theAuthor } ${ action } rule to turn FS ${ onOrOff } ${ schedulingAndLocation }`;
      }
      else {
        const action = !rule.id ? 'scheduled a new' : rule.is_deleted ? 'deleted the scheduled' : 'updated a scheduled';
        let meterInteraction: string;
        if(rule.task_type) {
          meterInteraction =
            rule.task_type === 'READ_VOLTAGE' ? 'voltage' :
              rule.task_type === 'READ_POWER' ? 'power' :
                rule.task_type === 'READ_CREDIT' ? 'credit' :
                  'unknown';
        }
        message = `${ theAuthor } ${ action } scan to read meter ${ meterInteraction } ${ schedulingAndLocation }`;
      }

      this.supabaseService.adminClient
        .from('audits')
        .insert({
          message,
          from_fs_command: !!rule.fs_command,
          author_id: author.account_id,
          organization_id: grid.organization_id,
          grid_id,
        })
        .then(this.supabaseService.handleResponse)
      ;
    });
  }

  private async executeRule(rule: BatchRuleToExecute) {
    // @TODO :: This can be simplified when we stop having dual meter grids
    const isDualMeterGrid = rule.grid.uses_dual_meter_setup;

    // 1) Determine the meter-interaction type
    let meterInteractionType: MeterInteractionTypeEnum;

    if(rule.fs_command) {
      // console.info(`[EXECUTE BATCH RULE] Starting FS rule for grid with ID ${ rule.grid.id }`);
      if(isDualMeterGrid) {
        meterInteractionType = rule.fs_command === 'ON' ? 'TURN_ON' : 'TURN_OFF';
      }
      else {
        meterInteractionType = 'SET_POWER_LIMIT';
      }
    }

    if(rule.task_type) {
      meterInteractionType = rule.task_type;
    }

    // 2) Fetch meters from Supabase
    const metersSbQuery = this.supabaseService.adminClient
      .from('meters')
      .select(`
        id,
        external_reference,
        last_sts_token_issued_at,
        communication_protocol,
        is_simulated,
        meter_phase,
        version,
        decoder_key,
        power_limit_hps_mode,
        last_seen_at,
        dcu_id,
        connection:connections!inner(
          customer:customers!inner(
            grid_id
          )
        ),
        install_session:last_metering_hardware_install_session_id!inner(
          commissioning:last_meter_commissioning_id!inner(
            meter_commissioning_status
          )
        )
      `)
      .eq('connection.customer.grid_id', rule.grid.id)
      .eq('install_session.commissioning.meter_commissioning_status', 'SUCCESSFUL')
    ;

    if(rule.fs_command) {
      metersSbQuery.is('is_manual_mode_on', false);
      if(isDualMeterGrid) metersSbQuery.eq('meter_type', 'FS');
    }

    const meters = await metersSbQuery.then(this.supabaseService.handleResponse);

    // 2) Create a batch execution
    const _execution = await this.supabaseService.adminClient
      .from('directive_batch_executions')
      .insert({
        directive_batch_id: rule.id,
        total_count: meters.length,
        pending_count: meters.length,
      })
      .select('id')
      .single()
      .then(this.supabaseService.handleResponse)
    ;

    const _nowForMeta = (new Date()).toISOString();

    // 3) Delete one-shot rules
    if(!rule.is_repeating) this.supabaseService.adminClient
      .from('directive_batches')
      .update({
        is_deleted: true,
        updated_at: _nowForMeta,
      })
      .eq('id', rule.id)
      .then(this.supabaseService.handleResponse)
    ;

    // 4) Update grid if it's an FS command
    if(rule.fs_command) this.supabaseService.adminClient
      .from('grids')
      .update({
        should_fs_be_on: rule.fs_command === 'ON',
        should_fs_be_on_updated_at: _nowForMeta,
      })
      .eq('id', rule.grid.id)
      .then(this.supabaseService.handleResponse)
    ;

    // 5) Create interactions for every meter, and potentially update the meter

    // @TODO :: Consider whether we'd need a 'create-many' for meter interactions
    //          We'd need to generate the tokens (and update DTOs based on the response) individually,
    //          But we could make one batch insert at least.
    for(const meter of meters) {
      const meterInteractionDto: CreateMeterInteractionDto = {
        meter_interaction_type: meterInteractionType,
        meter_id: meter.id,
        batch_execution_id: _execution.id,
      };

      if(rule.fs_command && !isDualMeterGrid) {
        meterInteractionDto.target_power_limit = rule.fs_command === 'ON' ? 0 : meter.power_limit_hps_mode;
      }

      await this.meterInteractionsService.createOneForMeter(meterInteractionDto, { ...meter, grid_id: meter.connection.customer.grid_id });

      if(rule.fs_command) {
        const _nowForMeter = (new Date()).toISOString();
        const meterUpdateDto = isDualMeterGrid ? {
          should_be_on: rule.fs_command === 'ON',
          should_be_on_updated_at: _nowForMeter,
        } : {
          power_limit_should_be: meterInteractionDto.target_power_limit,
          power_limit_should_be_updated_at: _nowForMeter,
        };
        await this.supabaseService.adminClient
          .from('meters')
          .update(meterUpdateDto)
          .eq('id', meter.id)
          .then(this.supabaseService.handleResponse)
        ;
      }
    }
  }

  @Cron(CronExpression.EVERY_MINUTE, { disabled: process.env.NXT_ENV !== 'production' })
  async executeScheduledBatches(): Promise<void> {
    const _now = moment();
    const hour = _now.hour();
    const minute = _now.minute();

    try {
      const directiveBatches = await this.supabaseService.adminClient
        .from('directive_batches')
        .select(`
          id,
          fs_command,
          task_type,
          is_repeating,
          grid:grids(
            id,
            uses_dual_meter_setup
          )
        `)
        .eq('hour', hour)
        .eq('minute', minute)
        .is('is_deleted', false)
        .then(this.supabaseService.handleResponse)
      ;

      // This will run all batches without waiting for the previous to finish its async operations
      for (const rule of directiveBatches) {
        void this.executeRule(rule);
      }
    }
    catch(err) {
      console.error('Error executing scheduled batches', err.message);
    }
  }
}
