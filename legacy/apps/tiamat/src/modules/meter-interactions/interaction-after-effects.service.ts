import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { isNotNil } from 'ramda';
import { SupabaseService } from '@core/modules/supabase.module';
import { HttpService } from '@nestjs/axios';
import { MeterInteractionsService } from './meter-interactions.service';
import { MeterInstallsService } from '../meter-installs/meter-installs.service';
import { DirectiveBatchExecutionsService } from '../directive-batch-executions/directive-batch-executions.service';
import { TelegramService } from '../telegram/telegram.service';
import { WebsocketService } from '../websocket/websocket.service';
import { Json, MeterInteractionStatusEnum, MeterInteractionTypeEnum, UpdateMeter } from '@core/types/supabase-types';
import { kwhToMonetaryBalance } from './lib/kwh-to-monetary-balance';
import { GatewayInfo } from '../device-messages/lib/types';
import { FullMeterInteractionForAfterEffects, meterInteractionForAfterEffectsQuery } from './lib/supabase';
import { pendingStatuses } from './lib/meter-interaction-status-helpers';

type MeterForAfterEffects = FullMeterInteractionForAfterEffects['meter'];
type MeterInteractionForAfterEffects = Omit<FullMeterInteractionForAfterEffects, 'meter'>

type MeterForPreDispatchEffects = {
  grid_id: number;
  external_reference: string;
  dcu_id?: number;
}
type MeterInteractionForPreDispatchEffects = {
  id: number;
  updated_at: string;
  meter_interaction_type: MeterInteractionTypeEnum;
  meter_interaction_status: MeterInteractionStatusEnum;
  meter_commissioning_id?: number;
}

type DeviceInfo = {
  gateway?: GatewayInfo,
}

type BlastoffConfig = {
  skipWebsocketEmission?: boolean;
}

@Injectable()
export class InteractionAfterEffectsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly httpService: HttpService,
    @Inject(forwardRef(() => MeterInteractionsService))
    private readonly meterInteractionsService: MeterInteractionsService,
    @Inject(forwardRef(() => MeterInstallsService))
    private readonly meterInstallsService: MeterInstallsService,
    private readonly telegramService: TelegramService,
    private readonly batchExecutionsService: DirectiveBatchExecutionsService,
    private readonly websocketService: WebsocketService,
  ) {}

  async blastoff(meterInteractionId: number, deviceInfo: DeviceInfo, config: BlastoffConfig = {}) {
    const { adminClient: supabase, handleResponse } = this.supabaseService;

    const _interaction = await supabase
      .from('meter_interactions')
      .select(meterInteractionForAfterEffectsQuery)
      .eq('id', meterInteractionId)
      .maybeSingle()
      .then(handleResponse)
    ;

    const { meter, ...meter_interaction } = _interaction;
    const _isSuccessful = meter_interaction.meter_interaction_status === 'SUCCESSFUL';
    const _now = (new Date()).toISOString();

    const lastSeen = _isSuccessful ? { last_seen_at: _now }: {};

    const updateMeterDto: UpdateMeter = {
      ...lastSeen,
      ...(this.updateMeterByInteraction(meter, meter_interaction, _now)),
      ...(await this.updateMeterByDeviceInfo(meter, deviceInfo, _now)),
    };

    // @TODO :: Only closing issues for now, not opening needs re-evaluation of issues service
    this.closeLatestIssueIfNeeded(meter, updateMeterDto);

    // We now have all the necessary information to
    // update the meter, so do that first
    await this.supabaseService.adminClient
      .from('meters')
      .update(updateMeterDto)
      .eq('id', meter.id)
      .then(this.supabaseService.handleResponse)
    ;

    // Then kick off some other after-effects
    if(meter_interaction.order_id) {
      this.telegramService.updateNotificationForOrder(meter_interaction);
    }

    if(meter_interaction.batch_execution_id) {
      // @TOCHECK :: The following method fetches the batch; it might be possible to fetch in this method instead
      this.batchExecutionsService.recalculateDeliveryPercentage(meter_interaction.batch_execution_id);
    }

    if(meter_interaction.meter_commissioning) {
      this.meterInstallsService.advanceActiveCommissioningFlow(meter, meter_interaction);
    }
    // If any successful communication happened and we have a paused commissioning, resume it
    else if(_isSuccessful && meter.last_commissioning?.meter_commissioning_status === 'PENDING') {
      console.info('[SIDE-EFFECTS :: COMMISSIONING] Resume commissioning after interaction', meter.last_commissioning?.meter_commissioning_status);
      this.meterInstallsService.resumeInactiveCommissioningFlow(meter);
    }

    // Emit websocket UPDATE event for the status change (skip for unsolicited events)
    if (!config.skipWebsocketEmission) {
      this._emitMeterInteractionUpdate(meter_interaction, meter);
    }
  }

  private updateMeterByInteraction(meter: MeterForAfterEffects, meterInteraction: MeterInteractionForAfterEffects, now: string): UpdateMeter {
    // @TEMPORARY :: Fire off a read power limit for V1 for failed interaction investigation
    // @TODO :: Creating folluw-up interactions as a side-effect should probably be its own method, not a side-effect of a side-effect 🎉
    if(
      meterInteraction.meter_interaction_type === 'SET_POWER_LIMIT' &&
      meterInteraction.meter_interaction_status === 'FAILED' &&
      meter.communication_protocol === 'CALIN_V1'
    ) {
      this._doFollowUpInteraction(meter, {
        newInteractionType: 'READ_POWER_LIMIT',
        followingUpOnType: meterInteraction.meter_interaction_type,
      }, now);
    }

    if(meterInteraction.meter_interaction_status !== 'SUCCESSFUL') return {};

    switch(meterInteraction.meter_interaction_type) {
      // If these 'write' updates are not okay, we can trigger
      // new messages also, to do readbacks
      case 'TURN_ON': return {
        is_on: true,
        is_on_updated_at: now,
      };
      case 'TURN_OFF': return {
        is_on: false,
        is_on_updated_at: now,
      };
      case 'SET_POWER_LIMIT': return {
        power_limit: meterInteraction.target_power_limit,
        power_limit_updated_at: now,
      };
      case 'READ_POWER_LIMIT': return {
        power_limit: meterInteraction.result_value.power_limit,
        power_limit_updated_at: now,
      };
      case 'READ_VERSION': return {
        version: meterInteraction.result_value.version,
      };
      case 'TOP_UP':
      case 'CLEAR_CREDIT': {
        // In cases where we affect a meter's credit,
        // we need to dispatch a 'READ_CREDIT' interaction because
        // we can't be sure what the current total credit of the meter is.

        // @TEMPORARY :: Until we have a priority system? Then we can have
        // one READ_CREDIT as last. Meaning that we can now schedule deferred messages. To be continued..
        // We should skip this step when commissioning though, to limit
        // the amount of traffic over the network.
        if(!meterInteraction.meter_commissioning) {
          this._doFollowUpInteraction(meter, {
            newInteractionType: 'READ_CREDIT',
            followingUpOnType: meterInteraction.meter_interaction_type,
          }, now);
        }

        return {};
      };
      case 'READ_CREDIT': {
        const _dto: UpdateMeter = {
          kwh_credit_available: meterInteraction.result_value.kwh_credit_available,
          kwh_credit_available_updated_at: now,
          is_on: meterInteraction.result_value.is_on,
          is_on_updated_at: now,
        };
        const _balance = kwhToMonetaryBalance(meter, meterInteraction.result_value.kwh_credit_available);
        if(isNotNil(_balance)) {
          _dto.balance = _balance;
          _dto.balance_updated_at = now;
        }
        return _dto;
      }
      case 'READ_REPORT': {
        // @TOCHECK :: Would we update tamper from this, with the cover properties?
        const _dto: UpdateMeter = {
          kwh_credit_available: meterInteraction.result_value.purchase_remain_source_1,
          kwh_credit_available_updated_at: now,
          is_on: meterInteraction.result_value.meter_status.relay_open,
          is_on_updated_at: now,
        };
        const _balance = kwhToMonetaryBalance(meter, meterInteraction.result_value.purchase_remain_source_1);
        if(isNotNil(_balance)) {
          _dto.balance = _balance;
          _dto.balance_updated_at = now;
        }
        this._storeReadReportForAnalytics(meter.id, meterInteraction.result_value, now);

        return _dto;
      }
      default: return {};
    }
  }

  private async updateMeterByDeviceInfo(meter: MeterForAfterEffects, deviceInfo: DeviceInfo, now: string): Promise<UpdateMeter> {
    if(meter.communication_protocol !== 'CALIN_LORAWAN' || !deviceInfo?.gateway?.external_reference) return {};

    const { snr, rssi, external_reference } = deviceInfo.gateway;
    const _dto: UpdateMeter = {
      connection_metrics: { snr, rssi, updated_at: now },
    };

    const existingGatewayId = meter.dcu?.external_reference;
    if(existingGatewayId !== external_reference) {
      // console.info(`[INTERACTION AFTER-EFFECTS] Meter ${ meter.external_reference } switched to gateway ${ gatewayId }`);
      const newGateway = await this.supabaseService.adminClient
        .from('dcus')
        .select('id')
        .eq('external_reference', external_reference)
        .maybeSingle()
        .then(this.supabaseService.handleResponse)
      ;

      if(newGateway) _dto.dcu_id = newGateway.id;
      else console.warn(`[INTERACTION AFTER-EFFECTS] Meter ${ meter.external_reference } is communicating through gateway ${ external_reference } but it doesn't exist in our database yet.`);
    }

    return _dto;
  }

  private async _doFollowUpInteraction(
    meter: MeterForAfterEffects,
    { newInteractionType, followingUpOnType }: {
      newInteractionType: MeterInteractionTypeEnum;
      followingUpOnType: MeterInteractionTypeEnum;
    },
    now: string,
  ) {
    const meterForFollowUp = {
      id: meter.id,
      external_reference: meter.external_reference,
      last_sts_token_issued_at: meter.last_sts_token_issued_at,
      communication_protocol: meter.communication_protocol,
      meter_phase: meter.meter_phase,
      version: meter.version,
      last_seen_at: now,
      decoder_key: meter.decoder_key,
      grid_id: meter.connection?.customer.grid.id,
      dcu_id: meter.dcu.id,
    };

    this.meterInteractionsService.createOneForMeter(
      { meter_id: meter.id, meter_interaction_type: newInteractionType },
      meterForFollowUp,
      { followingUpOnType },
    );
  }

  private async closeLatestIssueIfNeeded(meter: MeterForAfterEffects, updateMeter: UpdateMeter) {
    const openIssue = meter.last_encountered_issue?.issue_status === 'OPEN' ? meter.last_encountered_issue : null;
    if(!openIssue) return;

    let closeExistingIssue = false;

    switch(openIssue.issue_type) {
      case 'NO_COMMUNICATION': {
        // If we saw the meter, it means it's communicating
        if(updateMeter.last_seen_at) closeExistingIssue = true;
        break;
      }
      case 'NO_CREDIT': {
        // If we now do have credit, close the issue
        if(
          isNotNil(updateMeter.kwh_credit_available) &&
            updateMeter.kwh_credit_available > 0
        ) closeExistingIssue = true;
        break;
      }
      case 'UNEXPECTED_POWER_LIMIT': {
        if(
          isNotNil(updateMeter.power_limit) &&
            meter.power_limit_should_be === updateMeter.power_limit
        ) closeExistingIssue = true;
        break;
      }
      case 'UNEXPECTED_METER_STATUS': {
        // Not handling this because confusing..
        break;
      }
    }

    if(closeExistingIssue) {
      this.supabaseService.adminClient
        .from('issues')
        .update({
          issue_status: 'CLOSED',
          closed_at: updateMeter.last_seen_at,
        })
        .eq('id', openIssue.id)
        .then(this.supabaseService.handleResponse)
      ;
    }
  }

  private _storeReadReportForAnalytics(meter_id: number, readReport: Json, now: string) {
    if(process.env.NXT_ENV !== 'production') return;
    const _toStore = {
      meter_id,
      // @TOCHECK :: Not doing this because I don't think it has any timezone info..
      // The meter is sending time in the local timezone
      // created_at: moment.tz(readReport.freeze_time),
      created_at: now,
      // The uplink pushes up a counter, not the consumption of that one hour
      counter_kwh: readReport.consumption_source_1,
      kwh_credit_available: readReport.purchase_remain_source_1,
    };
    this.httpService
      .axiosRef
      .post(`${ process.env.YETI_API }/meter-snapshot-1-h/hourly-report`, _toStore)
      .catch(err => {
        console.error('[METER-INTERACTION AFTER-EFFECTS] Error sending read report to Yeti', err.message ?? err);
      })
    ;
  }

  // @AUTOJOIN :: When an unknown meter joins, we could save it to our database
  public welcomeNewFriend(joinInteraction) {
    console.info('[METER-INTERACTION AFTER-EFFECTS] Welcome new friend!', joinInteraction);
    // @TODO :: We can pre-install a meter here, add it to our database.
    // We could technically already register it with ChirpStack, do we need to?
    // Or only generate application key, if already registered?
  }

  public onCreate(meter_interaction: MeterInteractionForPreDispatchEffects, meter: MeterForPreDispatchEffects) {
    this._emitMeterInteractionCreate(meter_interaction, meter);

    if(meter_interaction.meter_interaction_status === 'ABORTED')
      this.onAbort(meter_interaction);
  }

  public async onAbort({ meter_commissioning_id, updated_at }: MeterInteractionForPreDispatchEffects) {
    const { adminClient: supabase, handleResponse } = this.supabaseService;

    if(meter_commissioning_id) {
      await Promise.all([
        // Abort other pending interactions
        supabase
          .from('meter_interactions')
          .update({
            meter_interaction_status: 'ABORTED',
            updated_at,
          })
          .eq('meter_commissioning_id', meter_commissioning_id)
          .in('meter_interaction_status', pendingStatuses)
          .then(handleResponse),
        // Fail the commissioning
        supabase
          .from('meter_commissionings')
          .update({ meter_commissioning_status: 'FAILED' })
          .eq('id', meter_commissioning_id)
          .then(handleResponse),
      ]).catch(err => {
        console.error('[METER-INTERACTION AFTER-EFFECTS] Error failing meter install', err);
      });
    }
  }

  /**
   * Emit a CREATE event for a newly created meter interaction.
   */
  private async _emitMeterInteractionCreate(
    { id, updated_at, meter_interaction_type, meter_interaction_status }: MeterInteractionForPreDispatchEffects,
    meter: MeterForPreDispatchEffects,
  ): Promise<void> {
    try {
      // Fetch dcu external_reference if dcu_id exists
      let dcuExternalReference: string | null = null;
      if (meter.dcu_id) {
        const dcu = await this.supabaseService.adminClient
          .from('dcus')
          .select('external_reference')
          .eq('id', meter.dcu_id)
          .maybeSingle()
          .then(this.supabaseService.handleResponse);
        dcuExternalReference = dcu?.external_reference || null;
      }

      this.websocketService.emitMeterInteraction(
        meter.grid_id,
        'CREATE',
        {
          id,
          updated_at,
          meter_interaction_type,
          meter_interaction_status,
          meter_external_reference: meter.external_reference,
          dcu_external_reference: dcuExternalReference,
        },
      );
    }
    catch (error) {
      // Log but don't throw - websocket emission failures shouldn't break the main flow
      console.error('[METER-INTERACTION AFTER-EFFECTS] Failed to emit CREATE event:', error);
    }
  }

  /**
   * Emit an UPDATE event for a meter interaction status change.
   */
  private _emitMeterInteractionUpdate(
    {
      id,
      updated_at,
      meter_interaction_type,
      meter_interaction_status,
    }: MeterInteractionForAfterEffects,
    meter: MeterForAfterEffects,
  ): void {
    const gridId = meter.connection?.customer?.grid?.id;
    if (!gridId) {
      console.warn(
        `[METER-INTERACTION AFTER-EFFECTS] Cannot emit UPDATE event: grid_id not found for meter interaction ${ id }`,
      );
      return;
    }

    this.websocketService.emitMeterInteraction(
      gridId,
      'UPDATE',
      {
        id,
        updated_at,
        meter_interaction_type,
        meter_interaction_status,
        meter_external_reference: meter.external_reference,
        dcu_external_reference: meter.dcu?.external_reference || null,
      },
    );
  }
}
