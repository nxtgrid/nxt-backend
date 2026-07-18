import { DeviceMessageDevice, ParsedIncomingEvent } from '@tiamat/modules/device-messages/lib/types';
import { DecodedLorawanCalinEvent, LorawanCalinAckEvent, LorawanCalinUpEvent } from './types';

/**
 * An in-memory system to correlate LoRaWAN "up" and "ack" events,
 * which may arrive out of order.
 */

// Internal structure for storing partial data in the map
interface CorrelationEntry {
  queueItemId?: string;
  decoded?: DecodedLorawanCalinEvent;
  device?: DeviceMessageDevice,
  timestamp: number; // For Time-To-Live (TTL)
}

// The core of the system: maps deduplicationId -> partial data
const pendingCorrelations = new Map<string, CorrelationEntry>();

const onAckEvent = (event: LorawanCalinAckEvent): ParsedIncomingEvent => {
  const existingEntry = pendingCorrelations.get(event.deduplicationId);

  // If we have a match (up event arrived first), combine and return
  if (existingEntry?.decoded) {
    pendingCorrelations.delete(event.deduplicationId);
    // console.info('[LORAWAN CORRELATOR] ack matched existing up event', { deduplicationId: event.deduplicationId });
    return {
      delivery_queue_id: event.queueItemId,
      delivery_status: 'DELIVERY_SUCCESSFUL',
      response: {
        status: existingEntry.decoded.status,
        data: existingEntry.decoded.data,
      },
      failure_context: existingEntry.decoded.failure_context,
      device: existingEntry.device,
    };
  }

  // Store ack data and wait for up event
  pendingCorrelations.set(event.deduplicationId, {
    queueItemId: event.queueItemId,
    timestamp: Date.now(),
  });
  // console.info('[LORAWAN CORRELATOR] ack stored, waiting for up event', { deduplicationId: event.deduplicationId, pendingCount: pendingCorrelations.size });
  return null;
};

const onUpEvent = (event: LorawanCalinUpEvent, decoded: DecodedLorawanCalinEvent, device: DeviceMessageDevice): ParsedIncomingEvent => {
  const existingEntry = pendingCorrelations.get(event.deduplicationId);

  // If we have a match (ack event arrived first), combine and return
  if (existingEntry?.queueItemId) {
    pendingCorrelations.delete(event.deduplicationId);
    // console.info('[LORAWAN CORRELATOR] up matched existing ack event', { deduplicationId: event.deduplicationId });
    return {
      delivery_queue_id: existingEntry.queueItemId,
      delivery_status: 'DELIVERY_SUCCESSFUL',
      response: {
        status: decoded.status,
        data: decoded.data,
      },
      failure_context: decoded.failure_context,
      device,
    };
  }

  // Store up data and wait for ack event
  pendingCorrelations.set(event.deduplicationId, {
    timestamp: Date.now(),
    decoded,
    device,
  });
  // console.info('[LORAWAN CORRELATOR] up stored, waiting for ack event', { deduplicationId: event.deduplicationId, pendingCount: pendingCorrelations.size });
  return null;
};

/**
 * Garbage collection for stale correlation entries.
 * Events should correlate within milliseconds; 10s TTL is very generous.
 */
const CORRELATION_TTL_MS = 10_000;
const GC_INTERVAL_MS = 30_000;

const runGarbageCollection = (): void => {
  const now = Date.now();
  // let removedCount = 0;

  for (const [ deduplicationId, entry ] of pendingCorrelations.entries()) {
    if (now - entry.timestamp > CORRELATION_TTL_MS) {
      // Log what we're removing for debugging orphaned events
      // const entryType = entry.queueItemId ? 'ack-only' : 'up-only';
      // console.warn(`[LORAWAN CORRELATOR GC] Removing stale ${ entryType } entry with dedupe id ${ deduplicationId }`, entry);
      pendingCorrelations.delete(deduplicationId);
      // removedCount++;
    }
  }

  // if (removedCount > 0) {
  //   console.info(`[LORAWAN CORRELATOR GC] Cleaned ${ removedCount } stale entries`);
  // }
};

// Start GC interval
setInterval(runGarbageCollection, GC_INTERVAL_MS);

export const eventCorrelator = {
  onAckEvent,
  onUpEvent,
  /** Exposed for testing or manual invocation */
  runGarbageCollection,
  /** Exposed for debugging/monitoring */
  getPendingCount: (): number => pendingCorrelations.size,
};
