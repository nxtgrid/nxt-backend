import { Injectable } from '@nestjs/common';
import { InteractionContext, MeterForInteractionHandling } from './meter-interactions.service';
import { MeterInteractionStatusEnum, MeterInteractionTypeEnum } from '@core/types/supabase-types';
import { DeviceMessageDeliveryStatus, FailureReason } from '../device-messages/lib/types';
import { GridDigitalTwinService } from './grid-digital-twin.service';
import { isMeterInteractionStatusToAdjudicate } from './lib/meter-interaction-status-helpers';

export type InteractionFailureReason = Omit<FailureReason, 'status'> & {
  status: DeviceMessageDeliveryStatus | MeterInteractionStatusEnum;
};

const CALIN_LORAWAN = {
  METER_LAST_SEEN_THRESHOLD_MS: 24 * 60 * 60 * 1000,  // 24 hours
  COMMISSIONING: {
    METER_LAST_SEEN_THRESHOLD_MS: 59 * 60 * 1000,     // 59 minutes, basically based on the hourly report from Calin LoRaWAN meters
  },
};

const CALIN_API_V1 = {
  UNSUPPORTED_INTERACTIONS: [
    {
      VERSION: '2F6B4584',
      INTERACTIONS: [ 'READ_POWER_LIMIT' ] as Partial<MeterInteractionTypeEnum>[],
      REASON: 'Meter version "2F6B4584" does not support reading "power limit", "error" (special status), or "power down count"',
    },
  ],
};

@Injectable()
export class InteractionGatekeeperService {
  constructor(
    private readonly gridDigitalTwinService: GridDigitalTwinService,
  ) {}

  // We determine here based on external circumstances whether the
  // meter interaction should be QUEUED, SUSPENDED, or ABORTED
  adjudicate(
    interaction: { meter_interaction_type: MeterInteractionTypeEnum; meter_interaction_status?: MeterInteractionStatusEnum; },
    meter: MeterForInteractionHandling,
    context: InteractionContext,
  ): { meter_interaction_status: MeterInteractionStatusEnum; failure_reason?: InteractionFailureReason } {
    // Interaction status default is QUEUED if none is passed a priori
    const _currentStatus = interaction.meter_interaction_status ?? 'QUEUED';

    // Check if we need to adjudicate this (We don't adjudicate DEFERRED statuses for example)
    if(!isMeterInteractionStatusToAdjudicate(_currentStatus)) return { meter_interaction_status: _currentStatus };

    let blocked: { status: MeterInteractionStatusEnum; reason: string; isFinal?: boolean } | undefined;

    if(meter.communication_protocol === 'CALIN_LORAWAN') {
      blocked = this.checkCalinLorawanSpecific(meter, context);
    }

    else if([ 'CALIN_V1', 'CALIN_V2' ].includes(meter.communication_protocol)) {
      blocked = this.checkCalinApiSpecific(meter, interaction);
    }

    if(blocked) {
      return {
        meter_interaction_status: blocked.status,
        failure_reason: {
          timestamp: (new Date()).toISOString(),
          status: _currentStatus,
          reason: blocked.reason,
          ...(blocked.isFinal ? { isFinal: true } : {}),
        },
      };
    }

    // If there was no reason to block, we can proceed to queue the interaction
    return { meter_interaction_status: 'QUEUED' };
  }

  private checkCalinLorawanSpecific(
    meter: MeterForInteractionHandling,
    context: InteractionContext,
  ): { status: MeterInteractionStatusEnum; reason: string; isFinal?: boolean } | undefined {
    const _gridTwin = this.gridDigitalTwinService.getGridTwin(meter.grid_id);

    // `SUSPENDED` if grid is down
    if(_gridTwin?.is_energised === false) {
      return { status: 'SUSPENDED', reason: 'The grid is not energised. Holding off until power is restored' };
    }

    // `SUSPENDED` if ALL LoRaWAN gateways are down
    if(_gridTwin?.is_any_lorawan_gateway_online === false) {
      return { status: 'SUSPENDED', reason: 'All LoRaWAN gateways are offline. Holding off until connectivity is restored' };
    }

    // If meter has never been seen, treat it as if it was never seen (very old)
    const lastSeenMeterAt = meter.last_seen_at ? new Date(meter.last_seen_at) : null;
    const msSinceLastSeenMeter = lastSeenMeterAt
      ? ((new Date()).getTime() - lastSeenMeterAt.getTime())
      : Number.MAX_SAFE_INTEGER; // Treat as never seen

    // @TODO :: May be we should bring this back to the meter-installs, since DEFERRED is now in the domain of the
    // sequential queueing again, not in the gatekeeper domain.
    // We only reach this for commissioning meter-interaction if it's QUEUED, so only the single active one.
    // We can SUSPEND that normally. But if the meter itself hasn't communicated then we can DEFER it.
    // Resuming meter commissionings is handled by the `resumeInactiveCommissioningFlow` method in meter-installs.
    // Technically, that simply resumes a DEFERRED interaction (that was DEFERRED because it was not seen in the last hour).
    // But we can also implement something that would be part of the Gatekeeper, so we suspend it, and keep it suspended,
    // unless either the meter has sent a successful communication, or the last_seen_at is < an hour.
    // !!
    //
    // Yes that is the way, only one interaction can be QUEUED, the rest remains DEFERRED and can only be forwarded by
    // that one interaction being SUCCESSFULL / ABORTED / FAILED
    // So once it's QUEUED, it can never go back to DEFERRED, only BECOME SUSPENDED, so it becomes part of the Gatekeeper domain
    //
    // !!
    // Special treatment for commissionings, we keep those in DEFERRED, not SUSPENDED!
    if(context.fromCommissioning) {
      // Retries pass always (assuming people know what they're doing..)
      if(context.isRetry) return;

      // @TODO :: This may now become redundant since we'd immediately set the interaction to DEFERRED,
      //  which means the gatekeeper will never pick up on it.
      // !!
      // After a grid state transition, LoRaWAN meters may still be joining
      // the network. Wait for the meter to communicate on its own.
      if(context.fromGridStateTransition) {
        return { status: 'DEFERRED', reason: 'Grid conditions improved but meter has not yet communicated after network join' };
      }

      // `DEFERRED` if meter in commissioning and not seen for an hour
      if(msSinceLastSeenMeter > CALIN_LORAWAN.COMMISSIONING.METER_LAST_SEEN_THRESHOLD_MS) {
        return {
          status: 'DEFERRED',
          reason: lastSeenMeterAt
            ? `Meter hasn't been communicating for ${ Math.round(msSinceLastSeenMeter / 60_000) } minutes`
            : 'We have not (yet) received any communication from this meter',
        };
      }
    }

    // `ABORTED` if meter hasn't been seen for a long time
    if(msSinceLastSeenMeter > CALIN_LORAWAN.METER_LAST_SEEN_THRESHOLD_MS) {
      return {
        status: 'ABORTED',
        reason: lastSeenMeterAt
          ? `Meter hasn't been communicating for ${ Math.round(msSinceLastSeenMeter / 3_600_000) } hours`
          : 'We have not (yet) received any communication from this meter',
        isFinal: true,
      };
    }
  }

  private checkCalinApiSpecific(
    meter: MeterForInteractionHandling,
    { meter_interaction_type }: { meter_interaction_type: MeterInteractionTypeEnum },
  ): { status: MeterInteractionStatusEnum; reason: string; isFinal?: boolean } | undefined {
    const _gridTwin = this.gridDigitalTwinService.getGridTwin(meter.grid_id);
    const _gatewayTwin = _gridTwin?.gateways.find(({ id }) => id === meter.dcu_id);

    // `SUSPENDED` if grid is down
    if(_gridTwin?.is_energised === false) {
      return { status: 'SUSPENDED', reason: 'The grid is not energised. Holding off until power is restored' };
    }

    // `SUSPENDED` if gateway is offline
    if(_gatewayTwin && !_gatewayTwin.is_online) {
      return { status: 'SUSPENDED', reason: 'This meter\'s gateway is offline. Holding off until connectivity is restored' };
    }

    // This is a bit clunky, revisit if we happen to have more conditions
    // Also, the VERSION could be a conditional check, instead of the first, up-front check
    if(meter.communication_protocol === 'CALIN_V1') {
      const TO_CHECK = CALIN_API_V1.UNSUPPORTED_INTERACTIONS[0];
      if(meter.version === TO_CHECK.VERSION && TO_CHECK.INTERACTIONS.includes(meter_interaction_type)) {
        return { status: 'ABORTED', reason: TO_CHECK.REASON, isFinal: true };
      }
    }
  }
}
