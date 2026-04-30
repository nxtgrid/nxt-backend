import { MeterCommissioningStatusEnum } from '@core/types/supabase-types';

/**
 * Query parameters for lock-next.sql
 */
export type LockNextCommissioningParams = [
  lockSession: string,
  newStatus: MeterCommissioningStatusEnum,
  currentStatus: MeterCommissioningStatusEnum,
  dcuIsOnline: boolean,
  gridHpsIsOn: boolean,
  limit: number,
];

/**
 * Result type for lock-next.sql
 *
 * Locks the next meter commissioning for processing by assigning it to a lock session.
 * Only selects commissionings that are ready for processing (PENDING status) on meters
 * whose DCUs are online and grids have power (HPS is on).
 * Orders by creation time (oldest first) for FIFO processing.
 */
export type LockNextCommissioningResult = void;

