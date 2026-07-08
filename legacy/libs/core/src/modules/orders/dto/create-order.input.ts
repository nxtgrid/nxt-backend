import { Account } from '@core/modules/accounts/entities/account.entity';
import { UssdSession } from '@core/modules/ussd-sessions/entities/ussd-session.entity';
import { Wallet } from '@core/modules/wallets/entities/wallet.entity';
import { Connection } from '@core/modules/connections/entities/connection.entity';
import { Directive } from '@core/modules/directives/entities/directive.entity';
import { MeterCreditTransfer } from '@core/modules/meter-credit-transfers/entities/meter-credit-transfer.entity';
import { CurrencyEnum, MeterTypeEnum, OrderActorTypeEnum, OrderStatusEnum, PaymentChannelEnum, PaymentMethodEnum } from '@core/types/supabase-types';

export class CreateOrderInput {
  sender_wallet?: Wallet;

  sender_wallet_id?: number;

  receiver_wallet?: Wallet;

  receiver_wallet_id?: number;

  amount: number;

  currency: CurrencyEnum;

  connection?: Connection;

  external_reference?: string;

  order_status: OrderStatusEnum;

  ussd_session?: UssdSession;

  author?: Account;

  author_id?: number;

  tariff?: number;

  tariff_type?: MeterTypeEnum;

  payment_method?: PaymentMethodEnum;

  payment_channel?: PaymentChannelEnum;

  directive?: Directive;

  directive_id?: number;

  meter_credit_transfer?: MeterCreditTransfer;

  meta_sender_type?: OrderActorTypeEnum;

  meta_receiver_type?: OrderActorTypeEnum;

  meta_sender_name?: string;

  meta_receiver_name?: string;
}
