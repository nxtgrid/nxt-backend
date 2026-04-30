import { DeviceMessageDevice, ParsedIncomingEvent } from '@tiamat/modules/device-messages/lib/types';
import { DecodedLorawanCalinEvent, LorawanCalinAckEvent, LorawanCalinUpEvent } from './types';
import { redisRepo } from '@tiamat/modules/device-messages/lib/redis-repository';

/**
 * A Redis-based system to correlate LoRaWAN "up" and "ack" events,
 * which may arrive out of order.
 *
 * Benefits over in-memory:
 * - Works across multiple server instances (horizontal scaling)
 * - Automatic TTL expiration (no manual GC needed)
 * - Survives server restarts
 *
 * Trade-offs:
 * - Network round-trip latency (~1ms vs ~0.01ms for in-memory)
 * - Serialization overhead
 */

const CORRELATION_TTL_SECONDS = 10;
const CORRELATION_KEY_PREFIX = 'lorawan_correlation';

// Structure stored in Redis
interface StoredAckData {
  type: 'ack';
  queueItemId: string;
}

interface StoredUpData {
  type: 'up';
  decoded: DecodedLorawanCalinEvent;
  device: DeviceMessageDevice;
}

type StoredCorrelationData = StoredAckData | StoredUpData;

const correlationKey = (deduplicationId: string): string =>
  `${ CORRELATION_KEY_PREFIX }:${ deduplicationId }`;

const onAckEvent = async (event: LorawanCalinAckEvent): Promise<ParsedIncomingEvent | null> => {
  const key = correlationKey(event.deduplicationId);

  // Try to get and delete atomically
  const existing = await redisRepo.client.getdel(key);

  if (existing) {
    const parsed: StoredCorrelationData = JSON.parse(existing);

    // Only match if it's an 'up' entry (has the decoded data we need)
    if (parsed.type === 'up') {
      return {
        delivery_queue_id: event.queueItemId,
        delivery_status: 'DELIVERY_SUCCESSFUL',
        response: {
          status: parsed.decoded.status,
          data: parsed.decoded.data,
        },
        device: parsed.device,
      };
    }

    // Edge case: another ack arrived? Log and store ours
    console.warn('[LORAWAN CORRELATOR REDIS] Unexpected ack-ack collision', { deduplicationId: event.deduplicationId });
  }

  // Store ack data and wait for up event
  const ackData: StoredAckData = {
    type: 'ack',
    queueItemId: event.queueItemId,
  };
  await redisRepo.client.set(key, JSON.stringify(ackData), 'EX', CORRELATION_TTL_SECONDS);

  return null;
};

const onUpEvent = async (
  event: LorawanCalinUpEvent,
  decoded: DecodedLorawanCalinEvent,
  device: DeviceMessageDevice,
): Promise<ParsedIncomingEvent | null> => {
  const key = correlationKey(event.deduplicationId);

  // Try to get and delete atomically
  const existing = await redisRepo.client.getdel(key);

  if (existing) {
    const parsed: StoredCorrelationData = JSON.parse(existing);

    // Only match if it's an 'ack' entry (has the queueItemId we need)
    if (parsed.type === 'ack') {
      return {
        delivery_queue_id: parsed.queueItemId,
        delivery_status: 'DELIVERY_SUCCESSFUL',
        response: {
          status: decoded.status,
          data: decoded.data,
        },
        device,
      };
    }

    // Edge case: another up arrived? Log and store ours
    console.warn('[LORAWAN CORRELATOR REDIS] Unexpected up-up collision', { deduplicationId: event.deduplicationId });
  }

  // Store up data and wait for ack event
  const upData: StoredUpData = {
    type: 'up',
    decoded,
    device,
  };
  await redisRepo.client.set(key, JSON.stringify(upData), 'EX', CORRELATION_TTL_SECONDS);

  return null;
};

/**
 * Get count of pending correlations (for monitoring).
 * Note: This uses SCAN which is safe but may be slow with many keys.
 */
const getPendingCount = async (): Promise<number> => {
  let count = 0;
  let cursor = '0';

  do {
    const [ nextCursor, keys ] = await redisRepo.client.scan(cursor, 'MATCH', `${ CORRELATION_KEY_PREFIX }:*`, 'COUNT', 100);
    cursor = nextCursor;
    count += keys.length;
  } while (cursor !== '0');

  return count;
};

export const eventCorrelatorRedis = {
  onAckEvent,
  onUpEvent,
  getPendingCount,
};

