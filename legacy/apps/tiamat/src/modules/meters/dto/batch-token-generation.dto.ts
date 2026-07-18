import { Transform } from 'class-transformer';
import { IsIn, IsNumber, IsOptional } from 'class-validator';
import { GenerateTokenTypes, generateTokenTypes } from '@tiamat/modules/meter-interactions/lib/meter-interaction-type-helpers';

/**
 * DTO for the offline batch token generation endpoint.
 * Extends the same shape as ApiTokenGenerationDto but applies @Transform on
 * numeric fields because FormData serialises all values as strings.
 */
export class BatchTokenGenerationDto {
  @IsIn(generateTokenTypes)
    meter_interaction_type: GenerateTokenTypes;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsNumber()
    transactive_kwh?: number;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsNumber()
    target_power_limit?: number;
}
