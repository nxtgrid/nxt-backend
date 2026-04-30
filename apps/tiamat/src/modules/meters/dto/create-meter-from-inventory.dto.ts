import { IsIn, IsString } from 'class-validator';
import { CommunicationProtocolEnum, Constants, ExternalSystemEnum, MeterPhaseEnum } from '@core/types/supabase-types';

export class CreateMeterFromInventoryDto {
  @IsString()
    external_reference: string;

  @IsIn([ 'CALIN' ])
    external_system: ExternalSystemEnum;

  @IsString()
    decoder_key: string;

  @IsIn(Constants.public.Enums.meter_phase_enum)
    meter_phase: MeterPhaseEnum;

  @IsString()
    version: string; // Batch version

  @IsIn(Constants.public.Enums.communication_protocol_enum)
    communication_protocol: CommunicationProtocolEnum;
}
