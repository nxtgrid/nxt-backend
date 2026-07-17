import {
  IsEmail,
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

export class InviteMemberDto {
  @IsEmail()
    email!: string;

  @IsString()
  @IsOptional()
    redirectTo?: string;

  @IsString()
  @IsNotEmpty()
    full_name!: string;

  @IsNumber()
    organization_id!: number;

  @IsIn(Constants.public.Enums.member_type_enum)
    member_type!: MemberTypeEnum;

  @IsNumber()
  @IsOptional()
    busy_commissioning_id?: number;
}
