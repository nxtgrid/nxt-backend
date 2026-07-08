import { BadRequestException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@core/modules/supabase.module';
import { NxtSupabaseUser } from '../auth/nxt-supabase-user';
import { partition } from 'ramda';

import { CalinLorawanInstallService } from './adapters/calin-lorawan/_install.service';
import { CalinApiV1InstallService } from './adapters/calin-api-v1/_install.service';

import { DeviceManufacturerEnum, DeviceProtocolEnum, NetworkServerImplementation } from '../device-messages/lib/types';
import { CommunicationProtocolEnum, MeterCommissioningStatusEnum, MeterInteractionStatusEnum, MeterInteractionTypeEnum, MeterPhaseEnum } from '@core/types/supabase-types';
import { CreateMeterInteractionDto } from '../meter-interactions/dto/create-meter-interaction.dto';
import { MeterInteractionsService } from '../meter-interactions/meter-interactions.service';
import { isMeterInteractionStatusPending } from '../meter-interactions/lib/meter-interaction-status-helpers';
import { COMMISSIONING_COMMAND_SEQUENCE, sortByCommissioningPriority } from '../meter-interactions/lib/interaction-context';
import { getManufacturerAndProtocol } from '../meter-interactions/lib/manufacturer-protocol';
import { CalinApiV2InstallService } from './adapters/calin-api-v2/_install.service';

type MeterForInstallDto = {
  id: number;
  external_reference: string;
  communication_protocol: CommunicationProtocolEnum,
  meter_phase: MeterPhaseEnum;
  version: string;
  last_seen_at: string;
  last_sts_token_issued_at: string;
  decoder_key: string;
  dcu: {
    id: number;
    external_reference: string;
  };
  connection: {
    customer: {
      grid: {
        id: number;
        meter_commissioning_initial_credit_kwh: number;
      };
    };
  };

  // Added during process
  last_metering_hardware_install_session?: {
    id: number;
    last_metering_hardware_import_id: number;
  }
}

const meterForInstallSelectString = `
  id,
  external_reference,
  communication_protocol,
  meter_phase,
  version,
  last_seen_at,
  last_sts_token_issued_at,
  decoder_key,
  dcu:dcus(
    id,
    external_reference
  ),
  connection:connections(
    customer:customers(
      grid:grids(
        id,
        meter_commissioning_initial_credit_kwh
      )
    )
  ),
  last_metering_hardware_install_session:last_metering_hardware_install_session_id(
    id,
    last_metering_hardware_import_id
  )
`;

type InteractionForCommissioningUpdate = {
  id: number;
  meter_interaction_status: MeterInteractionStatusEnum;
  meter_commissioning: {
    id: number;
    meter_commissioning_status: MeterCommissioningStatusEnum;
  }
}

type MeterForCommissioningUpdate = {
  id: number;
  external_reference: string;
  last_sts_token_issued_at: string;
  communication_protocol: CommunicationProtocolEnum;
  meter_phase: MeterPhaseEnum;
  version: string;
  decoder_key: string;
  power_limit_hps_mode: number;
  last_seen_at: string;
  dcu: {
    id: number;
  };
  connection: {
    customer: {
      grid: {
        id: number;
        should_fs_be_on: boolean;
      };
    };
  };
  last_commissioning: {
    id: number;
    meter_commissioning_status: MeterCommissioningStatusEnum;
  };
}

type DeferredInteraction = {
  id: number;
  meter_interaction_type: MeterInteractionTypeEnum;
  transactive_kwh: number;
  target_power_limit: number;
}

@Injectable()
export class MeterInstallsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    @Inject(forwardRef(() => MeterInteractionsService))
    private readonly meterInteractionsService: MeterInteractionsService,
    private readonly calinLorawanInstallService: CalinLorawanInstallService,
    private readonly calinApiV1InstallService: CalinApiV1InstallService,
    private readonly calinApiV2InstallService: CalinApiV2InstallService,
  ) {}

  private ROUTE_MAP = {
    CALIN_LORAWAN: this.calinLorawanInstallService,
    CALIN_API_V1: this.calinApiV1InstallService,
    CALIN_API_V2: this.calinApiV2InstallService,
  };

  private getAdapter(manufacturer: DeviceManufacturerEnum, protocol: DeviceProtocolEnum) {
    if(!manufacturer || !protocol)
      throw new Error('Can\'t communicate with Network Server without manufacturer and protocol');
    const implementation = (manufacturer + '_' + protocol) as NetworkServerImplementation;
    const route = this.ROUTE_MAP[implementation];
    if(!route)
      throw new Error(`Can't find Network Server adapter for manufacturer ${ manufacturer } and protocol ${ protocol }`);
    return route;
  }

  async initialize(meter: MeterForInstallDto, author: NxtSupabaseUser) {
    const { adminClient: supabase, handleResponse } = this.supabaseService;

    const installSession = await supabase
      .from('metering_hardware_install_sessions')
      .insert({ meter_id: meter.id, author_id: author.account.id })
      .select('id')
      .single()
      .then(handleResponse)
    ;

    const deviceImport = await supabase
      .from('metering_hardware_imports')
      .insert({
        metering_hardware_install_session_id: installSession.id,
        metering_hardware_import_operation: 'ADD',
      })
      .select('id')
      .single()
      .then(handleResponse)
    ;

    // Add the new import to the install session
    await supabase
      .from('metering_hardware_install_sessions')
      .update({ last_metering_hardware_import_id: deviceImport.id })
      .eq('id', installSession.id)
      .then(handleResponse)
    ;

    this.registerOnNetworkServer({
      ...meter,
      last_metering_hardware_install_session: {
        id: installSession.id,
        last_metering_hardware_import_id: deviceImport.id,
      } });

    return installSession.id;
  }

  private async registerOnNetworkServer(meter: MeterForInstallDto) {
    if(![ 'CALIN_LORAWAN', 'CALIN_V1' ].includes(meter.communication_protocol)) return;
    const { manufacturer, protocol } = getManufacturerAndProtocol(meter.communication_protocol);
    const _adapter = this.getAdapter(manufacturer, protocol);

    try {
      const { deferUntilAsynchronousCallback } = await _adapter.registerOnNetworkServer({
        external_reference: meter.external_reference,
        meter_phase: meter.meter_phase,
        dcu_external_reference: meter.dcu?.external_reference,
      });
      if(deferUntilAsynchronousCallback) return;
    }
    catch(err) {
      console.error(`[METER-INSTALLS] Error registering meter ${ meter.external_reference } at network server`);
      console.error(err);
      return;
    }

    // If we immediately succeeded import, continue
    await this.supabaseService.adminClient
      .from('metering_hardware_imports')
      .update({ metering_hardware_import_status: 'SUCCESSFUL' })
      .eq('id', meter.last_metering_hardware_install_session.last_metering_hardware_import_id)
      .then(this.supabaseService.handleResponse)
    ;

    this.startNewCommissioning(meter);
  }

  public async resumeDeferredInstall(external_reference: string, result: 'SUCCESSFUL' | 'FAILED') {
    const { adminClient: supabase, handleResponse } = this.supabaseService;

    const meter = await supabase
      .from('meters')
      .select(meterForInstallSelectString)
      .eq('external_reference', external_reference)
      .single()
      .then(handleResponse)
    ;

    // Update import status
    await supabase
      .from('metering_hardware_imports')
      .update({ metering_hardware_import_status: result })
      .eq('id', meter.last_metering_hardware_install_session.last_metering_hardware_import_id)
      .then(this.supabaseService.handleResponse)
    ;

    if(result === 'SUCCESSFUL') this.startNewCommissioning(meter);
  }

  private async startNewCommissioning(meter: MeterForInstallDto, isRetry = false): Promise<{ id: number }> {
    const { adminClient: supabase, handleResponse } = this.supabaseService;
    const { grid } = meter.connection.customer;

    const _commissioning = await supabase
      .from('meter_commissionings')
      .insert({
        metering_hardware_install_session_id: meter.last_metering_hardware_install_session.id,
        meter_commissioning_status: 'PENDING', // @TODO :: This should be the default,
        // and set processing only when we resume or first commissioning interaction came in.
        // For V1/V2, this could be different
      })
      .select('id')
      .single()
      .then(handleResponse)
    ;

    // Add the new commissioning to the install session
    await supabase
      .from('metering_hardware_install_sessions')
      .update({ last_meter_commissioning_id: _commissioning.id })
      .eq('id', meter.last_metering_hardware_install_session.id)
      .then(handleResponse)
    ;

    // Create the meter-interactions to execute
    const baseCommand = {
      meter_id: meter.id,
      meter_commissioning_id: _commissioning.id,
    };

    const commandDtos = COMMISSIONING_COMMAND_SEQUENCE
      .map(meter_interaction_type => {
        // Skip TOP_UP if grid has no initial credit configured
        if(meter_interaction_type === 'TOP_UP' && grid.meter_commissioning_initial_credit_kwh <= 0) return;

        const dto: CreateMeterInteractionDto = {
          ...baseCommand,
          meter_interaction_type,
          // First interaction QUEUED, rest DEFERRED
          meter_interaction_status: meter_interaction_type === COMMISSIONING_COMMAND_SEQUENCE[0] ? 'QUEUED' : 'DEFERRED',
        };

        // Add interaction-specific fields
        if(meter_interaction_type === 'TOP_UP') {
          dto.transactive_kwh = grid.meter_commissioning_initial_credit_kwh;
        }
        // @NOTE :: For SET_POWER_LIMIT, we add the actual power limit only when this gets handled!

        return dto;
      })
      .filter(Boolean)
    ;

    // We want this sequential just so a list sorted by created_at in
    // the front-end displays the order of commands correctly
    for(const commandDto of commandDtos) {
      await this.meterInteractionsService.createOneForMeter(
        commandDto,
        { ...meter, /* last_sts_token_issued_at, */ grid_id: grid.id, dcu_id: meter.dcu?.id },
        { fromCommissioning: true, isRetry },
      );
    }

    return { id: _commissioning.id };
  }

  public async resumeInactiveCommissioningFlow(meter: MeterForCommissioningUpdate) {
    const { adminClient: supabase, handleResponse } = this.supabaseService;

    // Immediately set the commissioning to processing so no other events can trigger this again
    await supabase
      .from('meter_commissionings')
      .update({ meter_commissioning_status: 'PROCESSING' })
      .eq('id', meter.last_commissioning.id)
      .then(handleResponse)
    ;

    const allInteractions = await supabase
      .from('meter_interactions')
      .select(`
        id,
        meter_interaction_status,
        meter_interaction_type,
        transactive_kwh,
        target_power_limit
      `)
      .eq('meter_commissioning_id', meter.last_commissioning.id)
      .then(handleResponse)
    ;

    const [ deferredInteractions, otherInteractions ] = partition(({ meter_interaction_status }) => meter_interaction_status === 'DEFERRED', allInteractions);
    if(otherInteractions.length) {
      // If we have any interactions already queued, we can simply wait for those to finish
      const hasQueued = otherInteractions.some(({ meter_interaction_status }) => meter_interaction_status === 'QUEUED');
      if(hasQueued) return;
      // Otherwise we log and still continue
      console.warn(`
        [METER INSTALLS] Commissioning #${ meter.last_commissioning.id } has interactions
        that are not deferred, while its status was PENDING:
      `, otherInteractions);
    }
    if(!deferredInteractions.length) {
      console.warn('[METER INSTALLS] We have an unfinished commissioning but no deferred commands', allInteractions);
      return;
    }

    await this.pickAndEnqueueNextCommissioningInteraction(meter, deferredInteractions);
  }

  public async advanceActiveCommissioningFlow(meter: MeterForCommissioningUpdate, interaction: InteractionForCommissioningUpdate): Promise<void> {
    const { adminClient: supabase, handleResponse } = this.supabaseService;

    // If a command comes in but the commissioning is already failed, do nothing
    if(interaction.meter_commissioning.meter_commissioning_status === 'FAILED') return;

    // If a command is processing and the commissioning is pending, update commissioning
    if(interaction.meter_interaction_status === 'PROCESSING') {
      if(interaction.meter_commissioning.meter_commissioning_status === 'PENDING') {
        await supabase
          .from('meter_commissionings')
          .update({ meter_commissioning_status: 'PROCESSING' })
          .eq('id', interaction.meter_commissioning.id)
          .then(handleResponse)
        ;
      }
      return;
    }

    const otherInteractions = await supabase
      .from('meter_interactions')
      .select(`
        id,
        meter_interaction_status,
        meter_interaction_type,
        transactive_kwh,
        target_power_limit
      `)
      .eq('meter_commissioning_id', interaction.meter_commissioning.id)
      .not('id', 'eq', interaction.id)
      .then(handleResponse)
    ;

    // If the interaction has failed, abort the commissioning entirely
    if(interaction.meter_interaction_status === 'FAILED') {
      const pendingInteractionIds = otherInteractions
        .filter(({ meter_interaction_status }) =>
          isMeterInteractionStatusPending(meter_interaction_status))
        .map(({ id }) => id)
      ;
      console.info('[METER INSTALLS] Going to fail commissioning and abort interactions');
      await Promise.all([
        supabase
          .from('meter_interactions')
          .update({
            meter_interaction_status: 'ABORTED',
            updated_at: (new Date()).toISOString(),
          })
          .in('id', pendingInteractionIds)
          .then(handleResponse),
        supabase
          .from('meter_commissionings')
          .update({ meter_commissioning_status: 'FAILED' })
          .eq('id', interaction.meter_commissioning.id)
          .then(handleResponse),
      ]).catch(err => {
        console.error('[METER-INSTALLS] Error failing meter install', err);
      });
      return;
    }

    // If the interaction is successful, advance the commissioning
    if(interaction.meter_interaction_status === 'SUCCESSFUL') {
      // If everthing is successful, complete the process
      const areAllSuccessfull = otherInteractions
        .every(({ meter_interaction_status }) => meter_interaction_status === 'SUCCESSFUL');
      if(areAllSuccessfull) {
        await supabase
          .from('meter_commissionings')
          .update({ meter_commissioning_status: 'SUCCESSFUL' })
          .eq('id', interaction.meter_commissioning.id)
          .then(handleResponse)
        ;
        return;
      }

      const deferredInteractions = otherInteractions
        .filter(({ meter_interaction_status }) => meter_interaction_status === 'DEFERRED');

      if(!deferredInteractions.length) {
        console.warn('[METER INSTALLS] We have an unfinished commissioning but no deferred commands', otherInteractions);
        return;
      }

      await this.pickAndEnqueueNextCommissioningInteraction(meter, deferredInteractions);
      return;
    }

    console.warn('[METER INSTALLS :: COMMISSIONING] We got an interaction but no handler', interaction, otherInteractions);
  }

  private async pickAndEnqueueNextCommissioningInteraction(meter: MeterForCommissioningUpdate, deferredInteractions: DeferredInteraction[]): Promise<void> {
    const { connection: { customer: { grid } } } = meter;

    // Pick the next interaction based on the commissioning sequence order
    // Sort deferred interactions by their position in the sequence, then pick the first
    const nextInteraction = deferredInteractions
      .sort(sortByCommissioningPriority)[0];

    // For a deferred 'SET_POWER_LIMIT', we infer the power limit to set at
    // this actual moment, when the interaction is going to be handled.
    const tokenPayloadFields: { target_power_limit?: number } = {};
    if(nextInteraction.meter_interaction_type === 'SET_POWER_LIMIT') {
      // @TODO :: This does not take dual-meter grids into account
      tokenPayloadFields.target_power_limit = grid.should_fs_be_on ? 0 : meter.power_limit_hps_mode;
    }

    await this.meterInteractionsService.enqueueReleased(
      { ...nextInteraction, ...tokenPayloadFields },
      { ...meter, grid_id: grid.id, dcu_id: meter.dcu?.id },
      { fromCommissioning: true },
    );
  }

  public async retryCommissioning(id: number): Promise<{ id: number }> {
    const { adminClient: supabase, handleResponse } = this.supabaseService;

    const oldCommissioning = await supabase
      .from('meter_commissionings')
      .select(`
        meter_commissioning_status,
        ...metering_hardware_install_sessions!metering_hardware_install_session_id(
          meter_id
        )
      `)
      .eq('id', id)
      .maybeSingle()
      .then(handleResponse)
    ;

    if(!oldCommissioning) throw new NotFoundException(`Couldn't find meter commissioning with ID ${ id }`);

    if([ 'PROCESSING', 'SUCCESSFUL' ].includes(oldCommissioning.meter_commissioning_status))
      throw new BadRequestException(`Can't cancel meter commissioning of ID ${ id }, it is ${ oldCommissioning.meter_commissioning_status }.`);

    // Cancel commissioning and interactions if pending
    if(oldCommissioning.meter_commissioning_status === 'PENDING') {
      await supabase
        .from('meter_interactions')
        .update({
          meter_interaction_status: 'ABORTED',
          updated_at: (new Date()).toISOString(),
        })
        .eq('meter_commissioning_id', id)
        .in('meter_interaction_status', [ 'QUEUED', 'DEFERRED' ])
        .then(handleResponse)
      ;
      await supabase
        .from('meter_commissionings')
        .update({ meter_commissioning_status: 'FAILED' })
        .eq('id', id)
        .then(handleResponse)
      ;
    }

    const meter = await supabase
      .from('meters')
      .select(meterForInstallSelectString)
      .eq('id', oldCommissioning.meter_id)
      .single()
      .then(handleResponse)
    ;

    return this.startNewCommissioning(meter, true);
  }
}
