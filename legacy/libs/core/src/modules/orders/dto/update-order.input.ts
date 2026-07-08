import { MeterTypeEnum, OrderStatusEnum, PaymentMethodEnum } from '@core/types/supabase-types';

export class UpdateOrderInput {
  id?: number;

  order_status?: OrderStatusEnum;

  tariff?: number;

  tariff_type?: MeterTypeEnum;

  payment_method?: PaymentMethodEnum;

  amount?: number;
}
