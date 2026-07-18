import { IsIn, IsString } from 'class-validator';
import { CommunicationProtocolEnum, Constants, ExternalSystemEnum } from '@core/types/supabase-types';

export class CreateDcuFromInventory {
  @IsString()
    external_reference: string; // DCU number

  @IsIn([ 'CALIN' ])
    external_system: ExternalSystemEnum;

  @IsIn(Constants.public.Enums.communication_protocol_enum)
    communication_protocol: CommunicationProtocolEnum;
}
