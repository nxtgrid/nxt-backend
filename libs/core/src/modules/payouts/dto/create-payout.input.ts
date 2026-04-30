import { ExternalSystemEnum, PayoutStatusEnum } from '@core/types/supabase-types';

export class CreatePayoutInput {
  payout_status: PayoutStatusEnum;

  proposed_amount: number;

  external_reference?: string;

  external_system: ExternalSystemEnum;

  started_at: Date;

  ended_at: Date;

  draft_link?: string;

  grid_id: number;

  details?: any;
}
