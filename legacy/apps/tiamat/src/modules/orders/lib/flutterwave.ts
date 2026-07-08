import { PaymentMethodEnum } from '@core/types/supabase-types';

export const inferPaymentMethodFromFwTransaction = ({ payment_type }): PaymentMethodEnum | null => {
  switch(payment_type) {
    case 'card':
      return 'CREDIT_CARD';
    case 'bank_transfer':
      return 'BANK_TRANSFER';
    case 'ussd':
      return 'USSD';
    default:
      return null;
  }
};

