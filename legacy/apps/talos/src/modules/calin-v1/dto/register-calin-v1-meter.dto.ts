import { IsIn, IsString } from 'class-validator';
import { Constants, MeterPhaseEnum } from '@core/types/supabase-types';

export class RegisterCalinV1MeterDto {
  @IsString()
    external_reference: string;

  @IsIn(Constants.public.Enums.meter_phase_enum)
    meter_phase: MeterPhaseEnum;

  @IsString()
    dcu_external_reference: string;
}
