import { IsISO8601, IsNumber } from 'class-validator';

export class GeneratePayoutDto {
  @IsNumber()
    grid_id: number;

  @IsISO8601()
    date_from: string;

  @IsISO8601()
    date_to: string;
}
