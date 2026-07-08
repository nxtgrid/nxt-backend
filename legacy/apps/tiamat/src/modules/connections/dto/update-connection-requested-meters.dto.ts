import { MeterPhaseEnum, MeterTypeEnum } from '@core/types/supabase-types';

interface UpdateRequestedMeter {
  id?: number;
  fee: number;
  meter_phase: MeterPhaseEnum;
  meter_type: MeterTypeEnum;

  // Extra prop coming from front-end to signal that we have to delete this
  is_deleted?: boolean;
}

export class UpdateConnectionRequestedMetersDto {
  connection_id: number;

  requested_meters: UpdateRequestedMeter[];
}
