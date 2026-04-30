import { Constants, MemberTypeEnum } from '@core/types/supabase-types';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEmail,
  IsNotEmpty,
  IsIn,
} from 'class-validator';

export class InviteMemberDto {
  @IsEmail()
    email: string;

  @IsString()
  @IsOptional()
    redirectTo?: string;

  @IsString()
  @IsNotEmpty()
    full_name: string;

  @IsNumber()
    organization_id: number;

  @IsIn(Constants.public.Enums.member_type_enum)
    member_type: MemberTypeEnum;

  @IsNumber()
  @IsOptional()
    busy_commissioning_id?: number;
}
