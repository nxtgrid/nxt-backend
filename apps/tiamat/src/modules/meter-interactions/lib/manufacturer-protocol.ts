import { CommunicationProtocolEnum } from '@core/types/supabase-types';
import { DeviceManufacturerEnum, DeviceProtocolEnum } from '@tiamat/modules/device-messages/lib/types';

export const getManufacturerAndProtocol =
(communicationProtocol: CommunicationProtocolEnum): { manufacturer: DeviceManufacturerEnum; protocol: DeviceProtocolEnum; } => {
  switch (communicationProtocol) {
    case 'CALIN_LORAWAN':
      return { manufacturer: 'CALIN', protocol: 'LORAWAN' };
    case 'CALIN_V1':
      return { manufacturer: 'CALIN', protocol: 'API_V1' };
    case 'CALIN_V2':
      return { manufacturer: 'CALIN', protocol: 'API_V2' };
    default:
      throw new Error(`Unsupported communication protocol: ${ communicationProtocol }`);
  }
};
