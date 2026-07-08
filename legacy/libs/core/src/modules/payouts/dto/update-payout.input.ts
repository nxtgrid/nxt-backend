import { PartialType } from '@nestjs/mapped-types';
import { CreatePayoutInput } from './create-payout.input';

export class UpdatePayoutInput extends PartialType(CreatePayoutInput) {
  id: number;

  approved_amount?: number;
}
