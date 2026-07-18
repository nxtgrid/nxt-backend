import { IsIn, IsNumber, IsOptional } from 'class-validator';
import { GenerateTokenTypes, generateTokenTypes } from '@tiamat/modules/meter-interactions/lib/meter-interaction-type-helpers';

export class ApiTokenGenerationDto {
  @IsIn(generateTokenTypes)
    meter_interaction_type: GenerateTokenTypes;

  @IsOptional()
  @IsNumber()
    transactive_kwh?: number;

  @IsOptional()
  @IsNumber()
    target_power_limit?: number;
}
