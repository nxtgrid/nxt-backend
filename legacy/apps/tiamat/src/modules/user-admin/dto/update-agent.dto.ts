import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsPhoneNumber, IsString } from 'class-validator';

export class UpdateAgentDto {
  @IsNumber()
    id: number;

  @IsString()
  @IsNotEmpty()
    full_name: string;

  @IsPhoneNumber()
    phone: string;

  @IsEmail()
  @IsOptional()
    email?: string;
}
