import { PhaseEnum } from '@core/types/device-messaging';
import { DeviceMessageDevice, NetworkServerImplementation } from '../types';

export const redisKeys = {
  /**
   * This is the main entity, the message
   * For every message a key is created, like
   *    key: device_message:[message_id]
   *    value: { ... data ... }
  **/
  message: (messageId: string) => `device_message:${ messageId }`,

  /**
   * The initial queue: a queue specific to manufacturer + protocol
   *    This queue is ordered by a) priority and b) first-in-first-out
   *    Current keys:
   *      - queue:lorawan_network:[grid_id]
   *      - queue:gateway:[gateway_id]
  **/
  queueInitial: (dto: { device: DeviceMessageDevice, grid_id: number }) => {
    // We have to always construct it like this: `'queue' : bottleneck : id of the bottleneck`
    // The LoRaWAN bottleneck is grid, so the queue is the lorawan network queue with grid id
    if(dto.device.protocol === 'LORAWAN') return `queue:lorawan_network:${ dto.grid_id }`;
    if(
      dto.device.protocol === 'API_V1' &&
      dto.device.manufacturer === 'CALIN'
    ) return `queue:gateway:${ dto.device.gateway.id }`;
    if(
      dto.device.protocol === 'API_V2' &&
      dto.device.manufacturer === 'CALIN'
    ) return `queue:gateway:${ dto.device.gateway.id }`;
    else return null;
  },

  // This is a special queue; a list of initial queuest to distribute from
  // Basically, if this is empty, there's no new message to distribute.
  // If there's an entry, then the distributor knows which queue to look
  // in to find the next message, as well as what distribution logic
  // to apply, by virtue of that message being in that particular queue.
  listOfInitialQueuesToDistributeFrom: () => 'queues_to_distribute_from',

  /**
   * Locking of queues
   * This locks a queue for a duration of time, and in some cases
   * could also be unlocked by custom logic.
   * Entry could look like:
   *  key:    lock_queue:lorawan_network:[grid_id]
   *  value:  locked
   *  ttl:    2000
  **/
  lockForQueue: (toLock: string) => `lock_queue:${ toLock }`,

  /**
   * Queue for PULL pattern implementations (API-based).
   * Messages wait here while we poll the external API for task completion.
   * Key format: queue_awaiting_task:CALIN_API_V1, queue_awaiting_task:CALIN_API_V2, etc.
   */
  queueAwaitingTask: (implementation: NetworkServerImplementation) => `queue_awaiting_task:${ implementation }`,

  /**
   * Gateway rate limiting (PULL pattern).
   * Tracks which messages are currently queued at a gateway's external API.
   * Used to limit concurrent tasks per gateway (e.g., max 5).
   * Key format: rate_limit:gateway:{gateway_id}
   * Value: SET of message IDs
   */
  gatewayRateLimit: (gatewayId: number) => `rate_limit:gateway:${ gatewayId }`,

  /**
   * Index for meter interaction ID with optional phase suffix.
   * For single-phase: idx:meter_interaction_id:123
   * For three-phase:  idx:meter_interaction_id:123_phA, idx:meter_interaction_id:123_phB, idx:meter_interaction_id:123_phC
   */
  indexMeterInteractionId: (meterInteractionId: number, phase?: PhaseEnum) => {
    const phaseSuffix = phase ? `_ph${ phase }` : '';
    return `idx:meter_interaction_id:${ meterInteractionId }${ phaseSuffix }`;
  },

  /** Index for lookup by external delivery reference */
  indexExternalDeliveryId: (externalDeliveryId: string) => `idx:external_delivery_id:${ externalDeliveryId }`,
};
