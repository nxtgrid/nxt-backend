import { Injectable } from '@nestjs/common';
import { LorawanCalinAckEvent, LorawanCalinDownEvent, LorawanCalinEvent, LorawanCalinUpEvent } from './lib/types';
import { decodeResponseData } from './lib/decode-response-data';
import { eventCorrelator } from './lib/correlate-request-response';
import { DeviceMessageDevice, GatewayInfo, ParsedIncomingEvent } from '../../lib/types';
import { selectGatewayWithBestSignal } from './lib/connectivity-helpers';

/**
 * The sequence from ChirpStack is
 * 1) Queueing with gRPC, returns queueItemId
 * 2) tx-ack event: Gateway confirms it sent it 'out' (with downlinkId and queueItemId)
 * 3) up event: Meter responds with data (with deduplicationId)
 * 4) ack event: Meter confirms it received (with queueItemId and deduplicationId)
 *
 * In reality, in ChirpStack 3 and 4 happen simultaneously and can be in reverse order,
 * which is why we have the correlator to match them, regardless of incoming order.
**/

@Injectable()
export class CalinLorawanIncomingService {
  handle(event: LorawanCalinEvent): ParsedIncomingEvent {
    const meterExternalReference = event.deviceInfo?.devEui.substring(5);
    if(!meterExternalReference) return null;

    /**
     * Downlink (tx-ack) event
     * Gateway confirmed the message was sent to meter
    **/
    if('downlinkId' in event) {
      return this.handleDown(event as LorawanCalinDownEvent, meterExternalReference);
    }

    /**
     * Ack uplink event
     * Meter acknowledged it received (and handled) the message
    **/
    if('acknowledged' in event) {
      return this.handleAck(event as LorawanCalinAckEvent, meterExternalReference);
    }

    /**
     * Join event
     * Meter joined the network
     * Meter was assigned a device address by the NS => no other data
    **/
    if('devAddr' in event && !('data' in event)) {
      // console.info('[LORAWAN CALIN INCOMING] Meter joining network', event);
      return this.handleJoin(meterExternalReference);
    }

    /**
     * Uplink event
     * Following the meter ack, this contains the meter's response data
    **/
    if('data' in event) {
      return this.handleUp(event as LorawanCalinUpEvent, meterExternalReference);
    }

    /**
     * Other events
     * Logs
    **/
    // console.info('[LORAWAN CALIN INCOMING] No event handler for event', event);
    return null;
  }

  private handleDown(event: LorawanCalinDownEvent, meterExternalReference: string): ParsedIncomingEvent {
    return {
      delivery_queue_id: event.queueItemId,
      delivery_status: 'SENT_TO_DEVICE',
      device: _createDevice(meterExternalReference),
    };
  }

  private handleJoin(meterExternalReference: string): ParsedIncomingEvent {
    return {
      delivery_status: 'DELIVERY_SUCCESSFUL',
      message_type: 'JOIN_NETWORK',
      response: {
        data: { network_joined: true },
        status: 'EXECUTION_SUCCESS',
      },
      device: _createDevice(meterExternalReference),
      unsolicited: true,
    };
  }

  private handleAck(event: LorawanCalinAckEvent, meterExternalReference: string): ParsedIncomingEvent {
    // If ack has failed, we failed to deliver to meter
    if(!event.acknowledged) return {
      delivery_queue_id: event.queueItemId,
      delivery_status: 'DELIVERY_FAILED',
      device: _createDevice(meterExternalReference),
      failure_context: { reason: 'Downlink not acknowledged by device (may be offline, out of range, or missed RX window)' },
    };

    // Send to correlator
    return eventCorrelator.onAckEvent(event);
  }

  private handleUp(event: LorawanCalinUpEvent, meterExternalReference: string): ParsedIncomingEvent {
    const decoded = decodeResponseData(event.data);
    if(!decoded) return null;

    const gateway = event.rxInfo?.length ? selectGatewayWithBestSignal(event.rxInfo) : undefined;
    const device: DeviceMessageDevice = _createDevice(meterExternalReference, gateway);

    // We immediately handle automatic events
    if(decoded.unsolicited_event_type === 'READ_REPORT') return {
      delivery_status: 'DELIVERY_SUCCESSFUL',
      message_type: decoded.unsolicited_event_type,
      response: {
        data: decoded.data,
        status: decoded.status,
      },
      device,
      unsolicited: true,
    };

    // Send to correlator
    return eventCorrelator.onUpEvent(event, decoded, device);
  }
}

/**
 * Helpers
**/

const _createDevice = (external_reference: string, gateway?: GatewayInfo): DeviceMessageDevice => ({
  type: 'ELECTRICITY_METER',
  external_reference,
  manufacturer: 'CALIN',
  protocol: 'LORAWAN',
  ...(gateway && { gateway }),
});
