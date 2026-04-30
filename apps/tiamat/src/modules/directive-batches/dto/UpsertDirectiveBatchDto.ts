import { Constants, DirectiveTypeEnum, FCommandTypeEnum, MeterInteractionTypeEnum } from '@core/types/supabase-types';
import { IsBoolean, IsIn, IsNumber, IsOptional } from 'class-validator';

export class UpsertDirectiveBatchDto {
  @IsNumber()
  @IsOptional()
    id?: number;

  @IsNumber()
    grid_id: number;

  @IsOptional()
  @IsIn(Constants.public.Enums.meter_interaction_type_enum)
    task_type: MeterInteractionTypeEnum;

  // @TODO :: Deprecate
  @IsOptional()
  @IsIn(Constants.public.Enums.directive_type_enum)
    directive_type: DirectiveTypeEnum;

  @IsIn(Constants.public.Enums.fs_command_type_enum)
    fs_command: FCommandTypeEnum;

  @IsNumber()
    hour: number;

  @IsNumber()
    minute: number;

  @IsBoolean()
    is_repeating: boolean;

  @IsBoolean()
    is_deleted: boolean;
}
