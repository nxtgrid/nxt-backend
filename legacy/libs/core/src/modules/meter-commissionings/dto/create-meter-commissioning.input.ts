import { MeterCommissioningStatusEnum } from '@core/types/supabase-types';

export class CreateMeterCommissioningInput {
  initialised_steps: number;
  pending_steps: number;
  processing_steps: number;
  successful_steps: number;
  failed_steps: number;
  total_steps: number;
  meter_commissioning_status: MeterCommissioningStatusEnum;

  lock_session?: string;
  is_retry?: boolean;

  metering_hardware_install_session_id: number;
}
