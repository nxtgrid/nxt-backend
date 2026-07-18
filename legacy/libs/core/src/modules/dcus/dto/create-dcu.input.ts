import { Grid } from '@core/modules/grids/entities/grid.entity';
import { CommunicationProtocolEnum, ExternalSystemEnum } from '@core/types/supabase-types';

export class CreateDcuInput {
  external_reference?: string;

  external_system?: ExternalSystemEnum;

  grid_id?: number;

  communication_protocol?: CommunicationProtocolEnum;

  is_online?: boolean;
  is_online_updated_at?: Date;
  last_online_at?: Date;

  grid?: Grid;

  queue_buffer_length?: number;
  last_metering_hardware_install_session_id?: number;

  rls_organization_id: number;
}
