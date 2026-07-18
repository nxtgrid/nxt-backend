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

  // For distribution logic (a grid equals a network)
  grid_id: number;

  // Reference for/to the 'upper' layers
  meter_interaction_id?: number;

  device: DeviceMessageDevice;
}
