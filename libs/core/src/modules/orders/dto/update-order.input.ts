import { MeterTypeEnum, OrderStatusEnum, PaymentMethodEnum } from '@core/types/supabase-types';
import { Directive } from '@core/modules/directives/entities/directive.entity';

export class UpdateOrderInput {
  id?: number;

  order_status?: OrderStatusEnum;

  directive?: Directive;

  directive_id?: number;

  tariff?: number;

  tariff_type?: MeterTypeEnum;

  payment_method?: PaymentMethodEnum;

  amount?: number;
}
