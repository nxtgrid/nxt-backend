import { supabase } from '@core/modules/supabase.module';
import { QueryData } from '@supabase/supabase-js';

export const meterInteractionForAfterEffectsQuery = `
  id,
  updated_at,
  meter_interaction_type,
  meter_interaction_status,
  result_value,
  target_power_limit,
  order_id,
  batch_execution_id,
  meter_commissioning:meter_commissionings(
    id,
    meter_commissioning_status
  ),
  meter:meters(
    id,
    external_reference,
    meter_type,
    meter_phase,
    version,
    kwh_tariff,
    last_sts_token_issued_at,
    communication_protocol,
    decoder_key,
    power_limit_should_be,
    power_limit_hps_mode,
    last_seen_at,
    dcu:dcus (
      id,
      external_reference
    ),
    connection:connections(
      id,
      customer:customers(
        id,
        grid:grids(
          id,
          should_fs_be_on,
          uses_dual_meter_setup,
          kwh_tariff_essential_service,
          kwh_tariff_full_service
        )
      )
    ),
    last_encountered_issue:last_encountered_issue_id(
      id,
      issue_status,
      issue_type
    ),
    ...metering_hardware_install_sessions!last_metering_hardware_install_session_id(
      last_commissioning:meter_commissionings!last_meter_commissioning_id(
        id,
        meter_commissioning_status
      )
    )
  )
`;

const _meterInteractionForAfterEffectsQuery = supabase.from('meter_interactions').select(meterInteractionForAfterEffectsQuery).single();
export type FullMeterInteractionForAfterEffects = QueryData<typeof _meterInteractionForAfterEffectsQuery>;
