import { Constants, CurrencyEnum, OrderStatusEnum, PaymentChannelEnum } from '@core/types/supabase-types';
import { IsIn, IsNumber, IsOptional, IsPositive, Max, Min } from 'class-validator';

export class ApiCreateOrderDto {
  @IsNumber()
    receiver_wallet_id: number;

  @IsNumber()
    sender_wallet_id: number;

  @IsNumber()
  @IsPositive()
  @Min(1)
  @Max(10000000)
    amount: number;

  @IsIn(Constants.public.Enums.currency_enum)
    currency: CurrencyEnum;

  @IsIn(Constants.public.Enums.payment_channel_enum)
    payment_channel: PaymentChannelEnum;

  @IsOptional()
  @IsNumber()
    author_id?: number;
}

export class CreateOrderDto extends ApiCreateOrderDto {
  order_status?: OrderStatusEnum;
  external_reference?: string;
  ussd_session_id?: number;
  meter_credit_transfer_id?: number;
}
