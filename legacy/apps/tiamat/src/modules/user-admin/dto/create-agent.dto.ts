import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsPhoneNumber, IsString } from 'class-validator';

export class CreateAgentDto {
  @IsString()
  @IsNotEmpty()
    full_name: string;

  @IsPhoneNumber()
    phone: string;

  @IsEmail()
  @IsOptional()
    email?: string;

  @IsNumber()
    grid_id: number;
}
