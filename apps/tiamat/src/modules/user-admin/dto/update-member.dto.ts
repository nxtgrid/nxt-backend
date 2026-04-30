import { Constants, MemberTypeEnum } from '@core/types/supabase-types';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsIn,
} from 'class-validator';

export class UpdateMemberDto {
  @IsNumber()
    id: number;

  @IsString()
  @IsNotEmpty()
    full_name: string;

  @IsIn(Constants.public.Enums.member_type_enum)
    member_type: MemberTypeEnum;

  @IsNumber()
    training_level: number;

  @IsNumber()
  @IsOptional()
    busy_commissioning_id?: number;

  @IsBoolean()
    subscribed_to_telegram_revenue_notifications: boolean;

  @IsBoolean()
    hidden: boolean;
}
