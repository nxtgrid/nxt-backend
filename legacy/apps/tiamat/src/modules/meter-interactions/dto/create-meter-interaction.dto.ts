import { IsIn, IsNumber, IsObject, IsOptional } from 'class-validator';
import { Constants, MeterInteractionTypeEnum, MeterInteractionStatusEnum } from '@core/types/supabase-types';

export class ApiCreateMeterInteractionDto {
  @IsNumber()
    meter_id: number;

  @IsIn(Constants.public.Enums.meter_interaction_type_enum)
    meter_interaction_type: MeterInteractionTypeEnum;

  // Optional for token generation
  @IsOptional()
  @IsNumber()
    transactive_kwh?: number;

  @IsOptional()
  @IsNumber()
    target_power_limit?: number;

  // Optional for writes
  @IsOptional()
  @IsObject()
    payload_data?: any;
}

export class CreateMeterInteractionDto extends ApiCreateMeterInteractionDto {
  meter_interaction_status?: MeterInteractionStatusEnum;

  // Generated token
  token?: string;

  // For orders
  order_id?: number;

  // For batch executions
  batch_execution_id?: number;

  // For commissionings
  meter_commissioning_id?: number;
}
