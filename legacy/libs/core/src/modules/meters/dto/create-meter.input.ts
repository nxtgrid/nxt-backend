import { Dcu } from '@core/modules/dcus/entities/dcu.entity';
import { Issue } from '@core/modules/issues/entities/issue.entity';
import { Connection } from '@core/modules/connections/entities/connection.entity';
import { CommunicationProtocolEnum, DirectiveSpecialStatusEnum, ExternalSystemEnum, MeterPhaseEnum, MeterTypeEnum } from '@core/types/supabase-types';

export class CreateMeterInput {

  external_system: ExternalSystemEnum;

  decoder_key: string;

  external_reference: string;

  nickname?: string;

  meter_phase?: MeterPhaseEnum;

  tou_outage_active_updated_at?: Date;
  connection?: Connection;

  meter_type?: MeterTypeEnum;

  latitude?: number;

  longitude?: number;

  coord_accuracy?: number;
  kwh_credit_available?: number;
  kwh_credit_available_updated_at?: Date;
  voltage?: number;
  voltage_updated_at?: Date;
  power?: number;
  power_updated_at?: Date;
  balance?: number;
  balance_updated_at?: Date;
  is_on?: boolean;
  is_on_updated_at?: Date;
  should_be_on?: boolean;
  should_be_on_updated_at?: Date;
  last_non_zero_consumption_at?: Date;
  dcu?: Dcu;

  is_manual_mode_on?: boolean;

  is_manual_mode_on_updated_at?: Date;

  power_limit_should_be?: number;

  power_limit_hps_mode?: number;

  power_limit_should_be_updated_at?: Date;

  power_limit?: number;
  power_limit_updated_at?: Date;

  last_seen_at?: Date;

  last_encountered_issue?: Issue;

  pole_id?: number;

  last_metering_hardware_install_session_id?: number;

  is_starred?: boolean;

  version?: string;
  current_special_status?: DirectiveSpecialStatusEnum;
  communication_protocol?: CommunicationProtocolEnum;

  is_cabin_meter?: boolean;

  power_down_count?: number;
  power_down_count_updated_at?: Date;

  rls_grid_id?: number;
  rls_organization_id?: number;
}
