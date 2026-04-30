import { CommunicationProtocolEnum, MhiStatusEnum } from '@core/types/supabase-types';

/**
 * Query parameters for lock-dcu.sql
 */
export type LockDcuParams = [
  newStatus: MhiStatusEnum,
  lockSession: string,
  currentStatus: MhiStatusEnum,
  isHpsOn: boolean,
  excludeProtocol: CommunicationProtocolEnum,
  dcuProtocol: CommunicationProtocolEnum,
  isAutoInstallEnabled: boolean,
  limit: number,
];

/**
 * Result type for lock-dcu.sql
 *
 * Locks pending DCU hardware imports for processing. The UPDATE query returns void.
 * After locking, use findByLockSessionAndType to retrieve the locked records.
 */
export type LockDcuResult = void;

