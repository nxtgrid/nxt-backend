import { IsNotEmpty, IsString } from 'class-validator';

export class ApiTokenDeliveryDto {
  @IsString()
  @IsNotEmpty()
    token: string;
}
