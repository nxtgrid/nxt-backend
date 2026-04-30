import { IsBoolean, IsEmail, IsLatitude, IsLongitude, IsNotEmpty, IsNumber, IsOptional, IsPhoneNumber, IsString } from 'class-validator';

export class UpdateCustomerDto {
  @IsNumber()
    id: number;

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
}
