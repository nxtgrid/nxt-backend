import { DeviceMessageDeliveryStatus, FailureReason } from '../../device-messages/lib/types';

/**
 * Response DTO for checking the delivery status of a meter interaction.
 *
 * When a meter interaction is being delivered, its status is tracked in Redis.
 * This DTO provides the delivery pipeline status and any retry history.
 * Returns null if the message is not currently being delivered.
 */
export class MeterInteractionDeliveryStatusDto {
  /** Current position in the delivery pipeline. */
  delivery_status: DeviceMessageDeliveryStatus;

  /** History of failed delivery attempts (if any). */
  delivery_failure_history?: FailureReason[];
}

