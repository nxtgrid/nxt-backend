import { GenerateTokenTypes } from '@tiamat/modules/meter-interactions/lib/meter-interaction-type-helpers';
import { DeviceManufacturerEnum, DeviceProtocolEnum } from '../lib/types';

export type GenerateTokenDto = {
  type: GenerateTokenTypes;
  issueDateString: string;
  deviceData: {
    external_reference: string;
    decoderKey?: string;
    manufacturer: DeviceManufacturerEnum;
    protocol: DeviceProtocolEnum;
  }
  payload?: {
    kwh?: number;
    powerLimit?: number;
  };
}
