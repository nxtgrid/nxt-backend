import { IsIn, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';
import { Constants, CurrencyEnum, PaymentChannelEnum } from '@core/types/supabase-types';

class BaseFlutterwaveDto {
  @IsNumber()
  @IsPositive()
  @Min(1)
    amount: number;

  @IsIn(Constants.public.Enums.currency_enum)
    currency: CurrencyEnum;

  @IsIn(Constants.public.Enums.payment_channel_enum)
    payment_channel: PaymentChannelEnum;
}

export class InitialiseFlutterwaveOrderDto extends BaseFlutterwaveDto {
  @IsString()
    external_reference: string;

  @IsNumber()
    receiver_wallet_id: number;
}

export class InitialisePublicFlutterwaveOrderDto extends BaseFlutterwaveDto {
  @IsString()
  @IsOptional()
    external_reference?: string;

  @IsString()
    meter_external_reference: string;
}
