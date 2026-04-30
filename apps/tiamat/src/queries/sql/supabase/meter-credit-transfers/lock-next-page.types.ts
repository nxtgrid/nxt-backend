import { MeterCreditTransferStatusEnum } from '@core/types/supabase-types';

/**
 * Query parameters for lock-next-page.sql
 */
export type LockNextCreditTransferPageParams = [
  lockSession: string,
  newStatus: MeterCreditTransferStatusEnum,
  currentStatus: MeterCreditTransferStatusEnum,
  limit: number,
  offset: number,
];

/**
 * Result type for lock-next-page.sql
 *
 * Locks a page of meter credit transfers for processing by assigning them to a lock session.
 * Selects transfers in PENDING status and updates them to PROCESSING status.
 * Used for batch processing of credit transfers (topups, purchases, etc.).
 */
export type LockNextCreditTransferPageResult = void;

