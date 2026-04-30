import { IsNumber, IsOptional, IsString } from 'class-validator';

export class VerifyFlutterwaveOrderDto {
  @IsNumber()
  @IsOptional()
    id?: number;

  @IsString()
  @IsOptional()
    external_reference?: string;
}
