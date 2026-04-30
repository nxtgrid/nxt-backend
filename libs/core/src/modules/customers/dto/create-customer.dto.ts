import { GenderEnum, GeneratorTypeEnum } from '@core/types/supabase-types';
import { IsBoolean, IsEmail, IsIn, IsLatitude, IsLongitude, IsNotEmpty, IsNumber, IsOptional, IsPhoneNumber, IsString } from 'class-validator';
import { Constants } from '@core/types/supabase-types';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
    full_name: string;

  @IsPhoneNumber()
  @IsOptional()
    phone?: string;

  @IsEmail()
  @IsOptional()
    email?: string;

  @IsLatitude()
  @IsOptional()
    latitude?: number;

  @IsLongitude()
  @IsOptional()
    longitude?: number;

  @IsBoolean()
    is_hidden_from_reporting: boolean;

  @IsNumber()
    grid_id: number;

  @IsBoolean()
  @IsOptional()
    lives_primarily_in_the_community?: boolean;

  @IsIn(Constants.public.Enums.generator_type_enum)
  @IsOptional()
    generator_owned?: GeneratorTypeEnum;

  @IsIn(Constants.public.Enums.gender_enum)
  @IsOptional()
    gender?: GenderEnum;

  @IsNumber()
  @IsOptional()
    total_connection_fee?: number;
}
