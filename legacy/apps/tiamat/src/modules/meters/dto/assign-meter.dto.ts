import { Constants, MeterPhaseEnum, MeterTypeEnum } from '@core/types/supabase-types';
import { IsIn, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class AssignMeterDto {
  @IsString()
  @IsNotEmpty()
    external_reference: string;

  @IsIn(Constants.public.Enums.meter_phase_enum)
    meter_phase: MeterPhaseEnum;

  @IsIn(Constants.public.Enums.meter_type_enum)
    meter_type: MeterTypeEnum;

  @IsNumber()
    connection_id: number;

  @IsNumber()
    pole_id: number;
}
