import { WeatherTypeEnum } from '@core/types/supabase-types';

export class CreateGridInput {
  name: string;

  nickname?: string;

  deployed_at?: Date;

  commissioned_at?: Date;

  identifier?: number;

  organization_id: number;

  kwh_tariff_essential_service?: number;

  kwh_tariff_full_service?: number;

  default_hps_connection_fee?: number;

  default_fs_1_phase_connection_fee?: number;

  default_fs_3_phase_connection_fee?: number;

  generation_external_site_id?: string;

  generation_external_gateway_id?: string;

  kwp?: number;

  kwp_tariff?: number;

  kwh_tariff?: number;

  kwh?: number;

  monthly_rental?: number;

  is_hps_on_threshold_kw?: number;

  walkthrough_external_id?: string;

  is_hidden_from_reporting?: boolean;

  is_using_vsat?: boolean;

  is_using_mobile_network?: boolean;

  is_fs_on: boolean;
  is_fs_on_updated_at?: Date;
  should_fs_be_on: boolean;
  should_fs_be_on_updated_at?: Date;
  is_hps_on: boolean;
  is_hps_on_updated_at?: Date;
  are_all_dcus_online: boolean;
  are_all_dcus_under_high_load_threshold: boolean;

  is_three_phase_supported?: boolean;

  kwh_per_battery_module?: number;

  telegram_response_path_token?: string;

  telegram_response_path_autopilot?: string;

  internal_telegram_group_chat_id?: string;

  internal_telegram_group_thread_id?: string;

  is_energised_notification_enabled: boolean;

  is_fs_on_notification_enabled: boolean;

  is_metering_hardware_online_notification_enabled: boolean;

  is_tariff_change_notification_enabled: boolean;

  is_upcoming_fs_control_rule_notification_enabled: boolean;

  is_fs_control_rule_change_notification_enabled: boolean;

  is_panel_cleaning_notification_enabled: boolean;

  is_automatic_meter_install_enabled: boolean;

  is_automatic_payout_generation_enabled: boolean;

  is_automatic_energy_generation_data_sync_enabled?: boolean;

  is_automatic_meter_energy_consumption_data_sync_enabled?: boolean;

  is_dcu_connectivity_tracking_enabled?: boolean;

  is_router_connectivity_tracking_enabled?: boolean;

  meter_consumption_issue_threshold_detection_days?: number;

  meter_communication_issue_threshold_detection_days?: number;

  lifeline_connection_kwh_threshold?: number;

  lifeline_connection_days_threshold?: number;

  meter_commissioning_initial_credit_kwh;

  is_cabin_meter_credit_depleting?: boolean;

  current_weather?: WeatherTypeEnum;
}
