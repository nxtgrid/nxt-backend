import { PhaseEnum } from '@core/types/device-messaging';
import { DeviceMessageDevice, DeviceMessageType, SetDatePayload, SetTimePayload } from '../lib/types';

export type CreateDeviceMessageDto = {
  message_type: DeviceMessageType;
  priority: number;

  // Payload for delivery, optional
  request_data?: {
    token?: string;
    payload?: SetDatePayload | SetTimePayload;
  };

  phase?: PhaseEnum;

  // For distribution logic (a grid equals a network).
  // `null` means the meter is not bound to any grid (e.g. orphan / test meters);
  // such messages are routed to a dedicated `unassigned` LoRaWAN queue.
  grid_id: number | null;

  // Reference for/to the 'upper' layers
  meter_interaction_id?: number;

  device: DeviceMessageDevice;
}
