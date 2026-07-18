import { CommunicationProtocolEnum, MhiStatusEnum } from '@core/types/supabase-types';

/**
 * Query parameters for lock-meter.sql
 */
export type LockMeterParams = [
  newStatus: MhiStatusEnum,
  lockSession: string,
  currentStatus: MhiStatusEnum,
  isDcuOnline: boolean,
  isHpsOn: boolean,
  excludeProtocol: CommunicationProtocolEnum,
  meterProtocol: CommunicationProtocolEnum,
  isAutoInstallEnabled: boolean,
  isTestModeOn: boolean,
  limit: number,
];

/**
 * Result type for lock-meter.sql
 *
 * Locks pending meter hardware imports for processing. The UPDATE query returns void.
 * After locking, use findByLockSessionAndType to retrieve the locked records.
 */
export type LockMeterResult = void;

