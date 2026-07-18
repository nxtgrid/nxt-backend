import { Injectable } from '@nestjs/common';
import { chirpStackRepo } from '../../lib/chirpstack-repository';
import { encodeRequestData } from './lib/encode-request-data';
import { DeviceMessage, DeviceMessageDeliveryStatus, FailureContext } from '../../lib/types';

/** Type for gRPC errors from ChirpStack. */
type GrpcError = { code?: number; details?: string };

@Injectable()
export class CalinLorawanOutgoingService {
  sendOne(message: DeviceMessage): Promise<string> {
    const { external_reference } = message.device;

    const bytes = encodeRequestData({
      deviceIdentifier: external_reference,
      devicePhase: message.phase ?? 'A',
      requestType: message.message_type,
      token: message.request_data?.token,
      payload: message.request_data?.payload,
    });

    if(!bytes) {
      console.error('[LORAWAN CALIN ENCODE REQUEST DATA] Failed to encode', message);
      throw new Error('Could not encode request data prior to sending to device');
    }

    // Ensure 16 digits (leading 0s if needed)
    const deviceEui = external_reference.padStart(16, '0');

    return chirpStackRepo.enqueueDeviceRequest(deviceEui, bytes);
  }

  async getRemoteStatus(message: DeviceMessage): Promise<{ delivery_status: DeviceMessageDeliveryStatus }> {
    const { external_reference } = message.device;

    // Ensure 16 digits (leading 0s if needed)
    const deviceEui = external_reference.padStart(16, '0');

    const remoteQueue = await chirpStackRepo.getDeviceQueue(deviceEui);
    const messageIsStillQueued = remoteQueue.some(({ delivery_queue_id }) => delivery_queue_id === message.delivery_queue_id);
    return {
      delivery_status: messageIsStillQueued ? message.delivery_status : 'DELIVERY_FAILED',
    };
  }

  /**
   * Parse a ChirpStack gRPC error into a structured failure context.
   * Detects known error patterns specific to the ChirpStack/LoRaWAN implementation.
   *
   * @param err - The error thrown by the ChirpStack gRPC client
   * @returns Failure context with human-readable reason and error details
   */
  parseError(err: unknown): FailureContext {
    const grpcError = err as GrpcError;
    const errorCode = grpcError.code;
    const details = grpcError.details;
    console.info('[PARSE GRPC ERROR] errorCode', errorCode);
    console.info('[PARSE GRPC ERROR] details', details);

    // Detect: Device not registered in ChirpStack (unrecoverable - skip retries)
    if (details?.includes('device_queue_item_dev_eui_fkey')) {
      return {
        reason: 'Device not registered in Network Server (ChirpStack)',
        errorCode,
        details,
        skipRetry: true,
      };
    }

    // Default fallback for unknown ChirpStack errors
    return {
      reason: 'Failed to enqueue message at ChirpStack',
      errorCode,
      details,
    };
  }
}
