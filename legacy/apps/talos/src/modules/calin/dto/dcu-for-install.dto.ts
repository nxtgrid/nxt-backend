import { CommunicationProtocolEnum } from '@core/types/supabase-types';

export interface DcuForInstallDto {
  id: number;
  external_reference: string;
  communication_protocol: CommunicationProtocolEnum;
  grid: {
    name: string;
  }
}
