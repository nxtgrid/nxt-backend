import moment from 'moment';
import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException, OnModuleInit } from '@nestjs/common';
import { isNil, isNotEmpty, isNotNil, pick } from 'ramda';

// Services
import { InteractionGatekeeperService } from './interaction-gatekeeper.service';
import { InteractionAfterEffectsService } from './interaction-after-effects.service';
import { GridDigitalTwinService } from './grid-digital-twin.service';
import { SupabaseService } from '@core/modules/supabase.module';
import { DeviceMessageOutgoingService } from '../device-messages/outgoing.service';
import { DeviceTokenService } from '../device-messages/token.service';

import { NxtSupabaseUser } from '../auth/nxt-supabase-user';
import { CommunicationProtocolEnum, MeterInteractionStatusEnum, MeterInteractionTypeEnum, MeterPhaseEnum, UpdateMeterInteraction } from '@core/types/supabase-types';
import { ApiCreateMeterInteractionDto, CreateMeterInteractionDto } from './dto/create-meter-interaction.dto';
import { GenerateTokenDto } from '../device-messages/dto/generate-token.dto';
import { DeviceMessage, DeviceMessageDeliveryStatus, FailureReason, MessageResponseStatus } from '../device-messages/lib/types';
import { MeterInteractionDeliveryStatusDto } from './dto/delivery-status.dto';
import { inferInteractionPriority } from './lib/interaction-context';
import { isPhaseSpecificReadInteraction, isTokenInteraction, isUnsolicitedInteraction } from './lib/meter-interaction-type-helpers';
import { PhaseEnum } from '@core/types/device-messaging';
import { ApiTokenGenerationDto } from '../meters/dto/token-generation.dto';
import { getManufacturerAndProtocol } from './lib/manufacturer-protocol';
import { aggregateThreePhaseResponse, allPhases } from './lib/three-phase-aggregation';

export type MeterForInteractionHandling = {
  id: number;
  external_reference: string;
  last_sts_token_issued_at: string;
  communication_protocol: CommunicationProtocolEnum;
  meter_phase: MeterPhaseEnum;
  version: string;
  last_seen_at: string | null;
  decoder_key: string;
  grid_id: number;
  dcu_id?: number;
}

export type InteractionContext = {
  fromUser?: boolean;
  fromCommissioning?: boolean;
  fromGridStateTransition?: boolean;
  isRetry?: boolean;
  followingUpOnType?: MeterInteractionTypeEnum;
};

@Injectable()
export class MeterInteractionsService implements OnModuleInit {
  constructor(
    private readonly interactionGatekeeperService: InteractionGatekeeperService,
    private readonly interactionAfterEffectsService: InteractionAfterEffectsService,
    private readonly gridDigitalTwinService: GridDigitalTwinService,
    private readonly supabaseService: SupabaseService,
    private readonly deviceMessageOutgoingService: DeviceMessageOutgoingService,
    private readonly deviceTokenService: DeviceTokenService,
  ) {}

  async onModuleInit() {
    this.deviceMessageOutgoingService.subscribe(this._onDeviceMessageEvent.bind(this));
    this.gridDigitalTwinService.onTransition(
      transitions => this.reconcileSuspendedInteractions(transitions.map(transition => transition.gridId)),
    );
    if(process.env.NXT_ENV === 'production') {
      // @CLAUDE :: Check if we can't just call this initially also from grid-digital-twin, ensuring the twins are generated
      // Not awaited: reconciliation can take minutes with thousands of records and must not block startup / health checks.
      this.reconcileSuspendedInteractions();
    }

    // const batch = [
    //   '47001768069',  // Matari     DCU 862207005
    //   '47001895201',  // Matari     DCU 862207005
    //   '47001894741',  // Matari     DCU 862207005
    //   '47003108736',  // Matari     DCU 862207005
    //   '47003108991',  // Matari     DCU 862207005

    //   '47001891614',  // Okpokunou  DCU 862405001
    //   '47001892646',  // Okpokunou  DCU 862405001
    //   '47001887067',  // Okpokunou  DCU 862405001
    //   '47001886838',  // Okpokunou  DCU 862405001
    //   '47001889527',  // Okpokunou  DCU 862405001

    //   // '47001887752',  // Okpokunou  DCU 862000258
    //   // '47001891473',  // Okpokunou  DCU 862000258

    //   '47003109445',  // Okpokunou  DCU 862406006
    //   '47001886705',  // Okpokunou  DCU 862406006
    //   '47001886747',  // Okpokunou  DCU 862406006
    //   '47001892851',  // Okpokunou  DCU 862406006
    //   '47001890905',  // Okpokunou  DCU 862406006

    //   '47001766832',  // Belel      DCU 862210006
    //   '47001767509',  // Belel      DCU 862210006
    //   '47001889972',  // Belel      DCU 862210006
    //   '47001765073',  // Belel      DCU 862210006
    //   '47001764217',  // Belel      DCU 862210006
    // ];

    // // const _shuffled = shuffle(batch);
    // // console.info(_shuffled);

    // const batch = [
    //   '47001891192', '47001891200', '47001887661', '47001887695', '47001893354', '47001894212', '47001892471', '47001888230', '47001894311', '47001886630', '47001891127', '47001893297', '47001887679', '47001890392', '47001887646', '47001890632', '47001890772', '47001891010', '47001886671', '47001887703', '47001890020', '47001886549', '47001890756', '47001891101', '47001892745', '47001893339', '47001895755', '47001890764', '47001895052', '47001890194', '47001891598', '47001886580', '47001886598', '47001888669', '47001891499', '47001888628', '47001888594', '47001890004', '47001892943', '47001888099', '47001886614', '47001892661', '47001889535', '47001891184', '47001893800', '47001886432', '47001889949', '47001892604', '47001892554', '47001892414', '47001890590', '47001892539', '47001890582', '47001895730', '47001891614', '47001890541', '47001890749', '47001888123', '47001888149', '47001890939', '47001887612', '47001891655', '47001895102', '47001888040', '47001890863', '47001895656', '47001886515', '47001891952', '47001886457', '47001889246', '47001889527', '47001889469', '47001891937', '47001892448', '47001887729', '47001889204', '47001892422', '47001892075', '47001888198', '47001887711', '47001889972', '47001886622', '47001886556', '47001890335',
    // ];

    // setTimeout(() => {
    //   this.batchTest('READ_VERSION', batch);
    // }, 4000);
  }

  private async batchTest(type: MeterInteractionTypeEnum, refs: string[]) {
    for(const external_reference of refs) {
      const meter = await this.supabaseService.adminClient
        .from('meters')
        .select(`
          id,
          external_reference,
          last_sts_token_issued_at,
          communication_protocol,
          meter_phase,
          decoder_key,
          last_seen_at,
          dcu_id,
          version,
          ...connections(
            ...customers(
              grid_id
            )
          )
        `)
        .eq('external_reference', external_reference)
        .single()
        .then(this.supabaseService.handleResponse)
      ;

      const dto: CreateMeterInteractionDto = {
        meter_id: meter.id,
        meter_interaction_type: type,
      };

      await this._create(dto, meter);
    }
  }

  // @TO-CHECK :: Isn't this really only needed for meters using STS tokens?
  // And isn't this then at device level?
  private async _updateMeterStsTokenIssueDate(meter: MeterForInteractionHandling): Promise<string> {
    const now = moment.utc(); // We force UTC so it's easier to test locally
    let issueDateMoment = now;

    if (meter.last_sts_token_issued_at) {
      const lastIssueMoment = moment(meter.last_sts_token_issued_at);
      const lastSTSIssuedAtXSecondsSinceEpoch = lastIssueMoment.unix();

      // Seconds elapsed since epoch.
      const secondsSinceEpoch = now.unix();

      // Seconds at this moment minus seconds from when the last STS was produced
      const secDiff = secondsSinceEpoch - lastSTSIssuedAtXSecondsSinceEpoch;

      // If less than a minute has passed from the last time an STS token was generated,
      // or the last STS token is in the future (secDiff < 0), then set the new issue
      // date to the last available timestamp, and add 1 minute
      if (secDiff < 60 || secDiff < 0) {
        issueDateMoment = lastIssueMoment;
        // If less than a minute went by, then the new STS should
        // be forced to go ahead in time
        issueDateMoment.add(1, 'minute');
      }
    }

    const newDateString = issueDateMoment.toISOString();

    await this.supabaseService.adminClient
      .from('meters')
      .update({ last_sts_token_issued_at: newDateString })
      .eq('id', meter.id)
      .then(this.supabaseService.handleResponse)
    ;

    return newDateString;
  }

  private async _maybeGenerateToken(
    interactionForToken: {
      meter_interaction_type: MeterInteractionTypeEnum,
      transactive_kwh?: number;
      target_power_limit?: number;
      token?: string;
    },
    meter: MeterForInteractionHandling,
  ): Promise<{
    token?: string;
    meter_interaction_status?: MeterInteractionStatusEnum,
    delivery_failure_history?: FailureReason[]
  }> {
    if(
      interactionForToken.token ||
      // We need to mention this explicitely for typing purposes
      interactionForToken.meter_interaction_type === 'DELIVER_PREEXISTING_TOKEN'
    ) {
      return { token: interactionForToken.token };
    }
    if(!isTokenInteraction(interactionForToken.meter_interaction_type)) return {};

    try {
      const issueDateString = await this._updateMeterStsTokenIssueDate(meter);
      const { transactive_kwh, target_power_limit } = interactionForToken;
      const tokenDto: GenerateTokenDto = {
        type: interactionForToken.meter_interaction_type,
        issueDateString,
        deviceData: {
          external_reference: meter.external_reference,
          decoderKey: meter.decoder_key,
          ...getManufacturerAndProtocol(meter.communication_protocol),
        },
      };
      if(transactive_kwh) tokenDto.payload = { kwh: transactive_kwh };
      else if(isNotNil(target_power_limit)) tokenDto.payload = { powerLimit: target_power_limit };
      // @TODO :: Do token retries too
      const token = await this.deviceTokenService.generate(tokenDto);
      return { token };
    }
    catch(err) {
      console.error('[METER INTERACTIONS] Error fetching token, failing interaction |', err.message);
      return {
        meter_interaction_status: 'FAILED',
        delivery_failure_history: [
          {
            timestamp: (new Date()).toISOString(),
            status: 'QUEUED',
            reason: 'Failed to generate token' + (err.message ? ` because ${ err.message }` : ''),
            errorCode: err.code,
            isFinal: true,
          },
        ],
      };
    }
  }

  private _sendToDevice(
    { id, meter_interaction_type, token, payload_data }: {
      id: number;
      meter_interaction_type: MeterInteractionTypeEnum;
      token?: string;
      payload_data?: any;
    },
    meter: MeterForInteractionHandling,
    context: InteractionContext,
  ) {
    const priority = inferInteractionPriority({
      interactionType: meter_interaction_type,
      ...context,
    });

    // For certain read commands for three-phase meters, we need to send out a request for all three phases (A, B, & C)
    const isThreePhaseRead = meter.meter_phase === 'THREE_PHASE' && isPhaseSpecificReadInteraction(meter_interaction_type);
    // ⚠️ VERY IMPORTANT! Currently we only send phases very specifically if it's a three-phase meter.
    // @TODO :: Check if we can mitigate this
    const phases: (PhaseEnum | null)[] = isThreePhaseRead ? [ 'A', 'B', 'C' ] : [ null ];

    for(const phase of phases) {
      // console.info(`[METER-INTERACTIONS] Creating message with priority ${ priority } for type ${ meter_interaction_type }${ phase ? (' with phase ' + phase) : '' } and context`, context);
      const request_data = {
        ...(token && { token }),
        ...(payload_data && { payload: payload_data }),
      };

      this.deviceMessageOutgoingService.enqueue({
        message_type: meter_interaction_type,
        priority,

        ...(isNotEmpty(request_data) && { request_data }),
        ...(phase && { phase }),

        grid_id: meter.grid_id,
        meter_interaction_id: id,

        device: {
          type: 'ELECTRICITY_METER',
          external_reference: meter.external_reference,
          ...getManufacturerAndProtocol(meter.communication_protocol),
          gateway: {
            id: meter.dcu_id,
          },
        },
      });
    }
  }

  private async _create(
    meterInteractionDto: CreateMeterInteractionDto,
    meter: MeterForInteractionHandling,
    context: InteractionContext = {},
  ) {
    // Check if we're going to queue, defer, or abort this meter interaction
    const { meter_interaction_status, failure_reason } = this.interactionGatekeeperService
      .adjudicate(meterInteractionDto, meter, context);
    const dtoWithStatus = {
      ...meterInteractionDto,
      meter_interaction_status,
      ...(failure_reason ? { delivery_failure_history: [ failure_reason ] } : {}),
    };

    // Conditionally generate a token for the meter interaction
    // For intentionally DEFERRED interactions, we generate only when they're enqueued
    const tokenFields = dtoWithStatus.meter_interaction_status === 'DEFERRED' ? {}
      : await this._maybeGenerateToken(meterInteractionDto, meter);
    const toCreate = { ...dtoWithStatus, ...tokenFields };

    const { id, updated_at } = await this.supabaseService.adminClient
      .from('meter_interactions')
      .insert(toCreate)
      .select('id, updated_at')
      .single()
      .then(this.supabaseService.handleResponse)
    ;

    const _meter_interaction = { id, updated_at, ...toCreate };

    // Emit CREATE event for the new interaction
    this.interactionAfterEffectsService.onCreate(_meter_interaction, meter);

    // Stop if we're not going to queue the interaction
    if(_meter_interaction.meter_interaction_status !== 'QUEUED') return _meter_interaction;

    this._sendToDevice(_meter_interaction, meter, context);

    return _meter_interaction;
  }

  public async enqueueReleased(
    updateInteractionDto: {
      id: number;
      meter_interaction_type: MeterInteractionTypeEnum,
      transactive_kwh?: number;
      target_power_limit?: number;
      token?: string;
    },
    meter: MeterForInteractionHandling,
    context: InteractionContext = {},
  ): Promise<void> {
    const tokenFields = await this._maybeGenerateToken(updateInteractionDto, meter);

    // Put updating in its own scope so we can't confuse values outside of it
    {
      const toUpdate: UpdateMeterInteraction = {
        updated_at: (new Date()).toISOString(),
        // We update the transactive fields too because they may just have been
        // determined a second before, without having updated the interaction yet
        ...pick([ 'transactive_kwh', 'target_power_limit' ], updateInteractionDto),
        // We update the status to queued..
        meter_interaction_status: 'QUEUED',
        // ..but this may overule `meter_interaction_status` if token fetch failed so putting that last
        ...tokenFields,
      };

      await this.supabaseService.adminClient
        .from('meter_interactions')
        .update(toUpdate)
        .eq('id', updateInteractionDto.id)
        .then(this.supabaseService.handleResponse)
      ;

      if(toUpdate.meter_interaction_status === 'FAILED') return;
    }

    this._sendToDevice({ id: updateInteractionDto.id, meter_interaction_type: updateInteractionDto.meter_interaction_type, token: tokenFields.token }, meter, context);
  }

  public createOneForMeter(meterInteractionDto: CreateMeterInteractionDto, meter: MeterForInteractionHandling, context: InteractionContext = {}) {
    return this._create(meterInteractionDto, meter, context);
  }

  public async createOneFromApi(meterInteractionDto: ApiCreateMeterInteractionDto, author: NxtSupabaseUser) {
    // Since we're going to use the admin client, we want to validate the authoring user
    await author.validate();

    const meter = await this.supabaseService.adminClient
      .from('meters')
      .select(`
        id,
        external_reference,
        last_sts_token_issued_at,
        communication_protocol,
        meter_phase,
        version,
        decoder_key,
        last_seen_at,
        dcu_id,
        ...connections(
          ...customers(
            grid_id
          )
        )
      `)
      .eq('id', meterInteractionDto.meter_id)
      .single()
      .then(this.supabaseService.handleResponse)
    ;

    return this._create(meterInteractionDto, meter, { fromUser: true });
  }

  public async generateTokenForMeter(generateTokenDto: ApiTokenGenerationDto, meter: MeterForInteractionHandling) {
    const { token } = await this._maybeGenerateToken(generateTokenDto, meter);
    if(!token) throw new InternalServerErrorException(`Couldn't generate a token for meter ${ meter.external_reference }`);
    return { token };
  }

  public async retryOne(id: number, author: NxtSupabaseUser) {
    // Since we're going to use the admin client, we want to validate the authoring user
    await author.validate();

    const { adminClient: supabase, handleResponse } = this.supabaseService;

    const _interaction = await supabase
      .from('meter_interactions')
      .select(`
        meter_interaction_status,
        meter_interaction_type,
        token,
        delivery_failure_history,
        meter:meters(
          id,
          external_reference,
          communication_protocol,
          version,
          last_sts_token_issued_at,
          last_seen_at,
          decoder_key,
          meter_phase,
          dcu_id,
          ...connections(
            ...customers(
              grid_id
            )
          )
        )
      `)
      .eq('id', id)
      .maybeSingle()
      .then(handleResponse)
    ;

    if(!_interaction) throw new NotFoundException(`No meter-interaction found for ID ${ id }`);
    if(_interaction.meter_interaction_status !== 'FAILED')
      throw new BadRequestException(`Can't retry meter-interaction ${ id } because it has status ${ _interaction.meter_interaction_status }`);

    const context = { isRetry: true, fromUser: true };
    const { meter_interaction_type, token, meter } = _interaction;
    const _now = (new Date()).toISOString();

    // 1) Adjudicate
    const { meter_interaction_status, failure_reason } = this.interactionGatekeeperService
      .adjudicate({ meter_interaction_type }, meter, context);

    const newHistory: FailureReason[] = [
      failure_reason as FailureReason,
      {
        reason: 'Retrying failed command',
        status: 'DELIVERY_FAILED',
        timestamp: _now,
      } as FailureReason,
      ...(_interaction.delivery_failure_history as FailureReason[]),
    ].filter(Boolean);

    // 2) Update
    await supabase
      .from('meter_interactions')
      .update({
        meter_interaction_status,
        updated_at: _now,
        delivery_failure_history: newHistory.filter(Boolean),
      })
      .eq('id', id)
      .then(handleResponse)
    ;

    // 3) Send to device
    if(meter_interaction_status === 'QUEUED')
      this._sendToDevice({ id, meter_interaction_type, token }, meter, context);

    return { id };
  }

  /**
   * Fetches SUSPENDED interactions and re-adjudicates each through the gatekeeper.
   * When called with grid IDs, scopes to those grids (transition-triggered).
   * When called without, reconciles all suspended interactions (startup / periodic).
   */
  public async reconcileSuspendedInteractions(affectedGridIds?: readonly number[]) {
    const { adminClient: supabase, handleResponse } = this.supabaseService;
    const counter = { queued: 0, suspended: 0, aborted: 0 };

    let query = supabase
      .from('meter_interactions')
      .select(`
        id,
        meter_interaction_type,
        meter_interaction_status,
        transactive_kwh,
        target_power_limit,
        delivery_failure_history,
        meter_commissioning_id,
        token,
        meter_id,
        meter:meters!inner(
          id,
          external_reference,
          last_sts_token_issued_at,
          communication_protocol,
          meter_phase,
          version,
          decoder_key,
          last_seen_at,
          dcu_id,
          ...connections!inner(
            ...customers!inner(
              grid_id
            )
          )
        )
      `)
      .eq('meter_interaction_status', 'SUSPENDED')
    ;

    if(affectedGridIds?.length) {
      query = query.in('meter.connections.customers.grid_id', [ ...affectedGridIds ]);
    }

    const suspendedInteractions = await query.then(handleResponse);

    if(!suspendedInteractions.length) return counter;
    console.info(`[METER INTERACTIONS] Re-adjudicating ${ suspendedInteractions.length } suspended interaction(s)${ affectedGridIds ? ` for grids ${ affectedGridIds.join(', ') }` : ' (full reconciliation)' }`);

    for(const _interaction of suspendedInteractions) {
      const { meter, ...meter_interaction } = _interaction;
      // `fromGridStateTransition` guards LoRaWAN commissioning from premature resumption
      //    — applies to any automated reconciliation, not just grid transitions
      const context: InteractionContext = {
        fromGridStateTransition: true,
        fromCommissioning: !!meter_interaction.meter_commissioning_id,
      };
      const { meter_interaction_status, failure_reason } = this.interactionGatekeeperService
        .adjudicate(meter_interaction, meter, context);

      // console.info(`[METER INTERACTIONS] ${ meter_interaction.id } went from SUSPENDED to ${ meter_interaction_status }`);

      if(meter_interaction_status === 'QUEUED') {
        counter.queued++;
        await this.enqueueReleased(meter_interaction, meter);
        continue;
      }

      // Still SUSPENDED or now ABORTED — prepend new failure reason to history (newest first)
      if(failure_reason) {
        const _existingHistory = meter_interaction.delivery_failure_history as FailureReason[] ?? [];
        const _toUpdate = {
          updated_at: (new Date()).toISOString(),
          meter_interaction_status,
          delivery_failure_history: [ failure_reason, ..._existingHistory ],
        };

        await supabase
          .from('meter_interactions')
          .update(_toUpdate satisfies UpdateMeterInteraction)
          .eq('id', meter_interaction.id)
          .then(handleResponse)
        ;

        if(meter_interaction_status === 'ABORTED') {
          counter.aborted++;
          this.interactionAfterEffectsService.onAbort({ ...meter_interaction, ..._toUpdate });
        }
        else {
          counter.suspended++;
        }
      }
    }

    return counter;
  }

  /**
   * Get the delivery status of a meter interaction that is currently being delivered.
   *
   * When a meter interaction is enqueued for delivery, it exists in Redis until
   * delivery completes (success or permanent failure). This method checks Redis
   * for the current delivery status.
   *
   * @param meterInteractionId - The ID of the meter interaction to check
   * @returns Delivery status DTO or null if not currently delivering
   */
  public async getDeliveryStatus(meterInteractionId: number): Promise<MeterInteractionDeliveryStatusDto | null> {
    const message = await this.deviceMessageOutgoingService.getMessageByMeterInteractionId(meterInteractionId);

    if (!message) return null;

    return {
      delivery_status: message.delivery_status,
      delivery_failure_history: message.failure_history,
    };
  }

  private _messageStatusToInteractionStatus(deliveryStatus: DeviceMessageDeliveryStatus, executionStatus?: MessageResponseStatus): MeterInteractionStatusEnum {
    switch(deliveryStatus) {
      case 'QUEUED':
        return 'QUEUED';
      case 'DELIVERY_FAILED':
        return 'FAILED';
      case 'DELIVERY_SUCCESSFUL':
        return executionStatus === 'EXECUTION_SUCCESS' ? 'SUCCESSFUL' : 'FAILED';
      default:
        return 'PROCESSING';
    }
  }

  private async _onDeviceMessageEvent(message: DeviceMessage) {
    const { meter_interaction_id, delivery_status, response, phase } = message;

    // Check if it's for us
    if(!meter_interaction_id) {
      this._handleUnsolicitedEvents(message);
      return;
    };

    // For three-phase reads, we need aggregation logic
    if (phase && this._isThreePhaseInteraction(message)) {
      await this._handleThreePhaseResponse(message);
      return;
    }

    const toUpdate: UpdateMeterInteraction = {
      meter_interaction_status: this._messageStatusToInteractionStatus(delivery_status, response?.status),
      updated_at: (new Date()).toISOString(),
      ...(delivery_status === 'DELIVERY_SUCCESSFUL' && response?.data && { result_value: response.data }),
    };

    // If we hit the end of delivery, also update the retry history if applicable
    if(
      [ 'DELIVERY_SUCCESSFUL', 'DELIVERY_FAILED' ].includes(message.delivery_status)
      && message.failure_history?.length
    ) {
      // Fetch existing history
      const interaction = await this.supabaseService.adminClient
        .from('meter_interactions')
        .select('delivery_failure_history')
        .eq('id', meter_interaction_id)
        .single()
        .then(this.supabaseService.handleResponse)
      ;

      // Prepend device-messages failure_history (already newest-first) to existing history (newest first)
      toUpdate.delivery_failure_history = [
        ...message.failure_history,
        ...(Array.isArray(interaction.delivery_failure_history) ? interaction.delivery_failure_history : []),
      ];
    }

    await this.supabaseService.adminClient
      .from('meter_interactions')
      .update(toUpdate)
      .eq('id', meter_interaction_id)
      .then(this.supabaseService.handleResponse)
    ;

    this.interactionAfterEffectsService.blastoff(meter_interaction_id, message.device);
  }

  private async _handleUnsolicitedEvents(message: DeviceMessage) {
    if(message.device?.type !== 'ELECTRICITY_METER' || !isUnsolicitedInteraction(message.message_type)) return;

    const { adminClient: supabase, handleResponse } = this.supabaseService;

    // Unsolicited events can create a successful meter interaction immediately
    if(message.response?.status === 'EXECUTION_SUCCESS') {
      const meter = await supabase
        .from('meters')
        .select('id')
        .eq('external_reference', message.device.external_reference)
        .maybeSingle()
        .then(handleResponse)
      ;

      if(!meter) {
        // @AUTOJOIN :: When an unknown meter joins, we could save it to our database
        if(message.message_type === 'JOIN_NETWORK') {
          this.interactionAfterEffectsService.welcomeNewFriend({
            meter_interaction_type: message.message_type,
            meter_interaction_status: 'SUCCESSFUL',
            result_value: message.response.data,
          });
        }
        else {
          console.warn(`
            [METER INTERACTIONS] Received unsolicited event of type ${ message.message_type }
            for meter ${ message.device.external_reference } but couldn't find it in our DB.
          `);
        }
        return;
      }

      // Currently we have two types of unsolicited events, both from LoRaWAN meters;
      // JOIN_NETWORK and READ_REPORT. Both need special treatment.

      // We do not need to store network joins nor count them as an event that would
      // mark a meter as 'successfully communicating' because, when a JOIN is actually
      // successful, the meter will send a READ_REPORT almost immediately afterwards.
      if(message.message_type === 'JOIN_NETWORK') {
        // @TODO :: Start having some form of JOIN counter so we know if a meter is having ISSUEs
        return;
      };

      // Some meters keep sending many read reports, so we only store if it's a fresh one
      if(message.message_type === 'READ_REPORT') {
        const lastReport = await supabase
          .from('meter_interactions')
          .select('result_value')
          .eq('meter_id', meter.id)
          .eq('meter_interaction_type', 'READ_REPORT')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
          .then(handleResponse)
        ;

        if(lastReport?.result_value.freeze_time === message.response.data.freeze_time) return;
      }

      const meter_interaction = await supabase
        .from('meter_interactions')
        .insert({
          meter_id: meter.id,
          meter_interaction_type: message.message_type,
          meter_interaction_status: 'SUCCESSFUL',
          result_value: message.response.data,
        })
        .select('id')
        .single()
        .then(handleResponse)
      ;

      this.interactionAfterEffectsService.blastoff(meter_interaction.id, message.device, { skipWebsocketEmission: true });
    }
  }

  /**
   * Three Phase logic
  **/

  /** Serializes three-phase read updates per interaction to avoid read-modify-write races. */
  threePhaseUpdateChain = new Map<number, Promise<void>>();

  /**
   * Check if a message is part of a three-phase read interaction.
   */
  private _isThreePhaseInteraction(message: DeviceMessage): boolean {
    return !!message.phase && isPhaseSpecificReadInteraction(message.message_type);
  }

  /**
   * Handle a response from one phase of a three-phase read.
   * Aggregates results and only marks complete when all phases respond.
   * Serialized per meter_interaction_id to avoid read-modify-write races when phases arrive concurrently.
   */
  private async _handleThreePhaseResponse(message: DeviceMessage): Promise<void> {
    const { meter_interaction_id } = message;
    const previous = this.threePhaseUpdateChain.get(meter_interaction_id) ?? Promise.resolve();
    const current = previous
      .then(() => this._doHandleThreePhaseResponse(message))
      .finally(() => {
        // Only delete if this promise is still the tail of the chain
        // (a later message may have already chained onto us)
        if(this.threePhaseUpdateChain.get(meter_interaction_id) === current) {
          this.threePhaseUpdateChain.delete(meter_interaction_id);
        }
      });
    this.threePhaseUpdateChain.set(meter_interaction_id, current);
    await current;
  }

  private async _doHandleThreePhaseResponse(message: DeviceMessage): Promise<void> {
    const { meter_interaction_id, delivery_status, response, phase } = message;
    let allPhasesResponded = false;

    // 1. Fetch current interaction state
    const interaction = await this.supabaseService.adminClient
      .from('meter_interactions')
      .select(`
        meter_interaction_type,
        meter_interaction_status,
        result_value,
        delivery_failure_history
      `)
      .eq('id', meter_interaction_id)
      .single()
      .then(this.supabaseService.handleResponse)
    ;

    // 2. Check if we're still processing
    const _thisMessageStatus = this._messageStatusToInteractionStatus(delivery_status, response?.status);
    if(interaction.meter_interaction_status === 'PROCESSING' && _thisMessageStatus === 'PROCESSING') return;

    const toUpdate: UpdateMeterInteraction = {
      updated_at: (new Date()).toISOString(),
    };

    if(interaction.meter_interaction_status === 'QUEUED' && _thisMessageStatus === 'PROCESSING') {
      toUpdate.meter_interaction_status = 'PROCESSING';
    }
    else {
      toUpdate.result_value = aggregateThreePhaseResponse(interaction, phase, response?.data);

      // 4. Check if all phases have responded and determine final status if applicable
      const respondedPhases = Object.keys(toUpdate.result_value.phase) as PhaseEnum[];
      allPhasesResponded = allPhases.every(_phase => respondedPhases.includes(_phase));
      if(allPhasesResponded) {
        const anyPhaseFailed = Object.values(toUpdate.result_value.phase).some(isNil);
        toUpdate.meter_interaction_status = anyPhaseFailed ? 'FAILED' : 'SUCCESSFUL';
      }
    }

    if(message.failure_history?.length) {
      // Prepend device-messages failure_history (already newest-first) to existing history (newest first)
      toUpdate.delivery_failure_history = [
        ...message.failure_history,
        ...(Array.isArray(interaction.delivery_failure_history) ? interaction.delivery_failure_history: []),
      ];
    }

    await this.supabaseService.adminClient
      .from('meter_interactions')
      .update(toUpdate)
      .eq('id', meter_interaction_id)
      .then(this.supabaseService.handleResponse)
    ;

    // We only trigger side-effects the first time we update to processing or when fully done
    if(toUpdate.meter_interaction_status === 'PROCESSING' || allPhasesResponded) {
      this.interactionAfterEffectsService.blastoff(meter_interaction_id, message.device);
    }
  }
}
