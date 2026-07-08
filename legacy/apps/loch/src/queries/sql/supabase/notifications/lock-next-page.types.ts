import {
  ExternalSystemEnum,
  NotificationStatusEnum,
  NotificationTypeEnum,
} from '@core/types/supabase-types';

/**
 * Query parameters for lock-next-page.sql
 */
export type LockNextPageParams = [
  lockSession: string,
  notificationStatus: NotificationStatusEnum,
  limit: number,
];

/**
 * Result type for lock-next-page.sql
 *
 * Note: The SQL query itself is an UPDATE that returns void.
 * This type represents the notification data fetched AFTER locking
 * via a separate Supabase query filtered by lock_session.
 */
export type LockedNotification = {
  /** Notification ID */
  id: number;
  /** External system for message delivery (e.g., SENDGRID, TELEGRAM) */
  carrier_external_system: ExternalSystemEnum;
  /** External system for webhook connector */
  connector_external_system: ExternalSystemEnum;
  /** Type of notification */
  notification_type: NotificationTypeEnum;
  /** UUID session that owns this notification */
  lock_session: string;
  /** Current processing status */
  notification_status: NotificationStatusEnum;
  /** External reference from carrier (e.g., message ID) */
  external_reference: string;
  /** When the notification was created */
  created_at: string;
};

/**
 * Result type for the UPDATE query itself (returns nothing)
 */
export type LockNextPageResult = void;

