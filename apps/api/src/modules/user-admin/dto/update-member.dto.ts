import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  Constants,
  type MemberTypeEnum,
} from '@nxt/core/types/supabase-types';

export class UpdateMemberDto {
  @IsNumber()
    id!: number;

  @IsString()
  @IsNotEmpty()
    full_name!: string;

  @IsIn(Constants.public.Enums.member_type_enum)
    member_type!: MemberTypeEnum;

  @IsNumber()
    training_level!: number;

  @IsNumber()
  @IsOptional()
    busy_commissioning_id?: number;

  @IsBoolean()
    subscribed_to_telegram_revenue_notifications!: boolean;

  @IsBoolean()
    hidden!: boolean;
}
