/**
 * @fileoverview PULL pattern lifecycle management (polling-based, e.g., CALIN API V1/V2).
 *
 * Handles:
 * - Polling for status updates with age-based backoff
 * - Age-based timeout with permanent failure (no retry)
 *
 * Functions return data; side effects (publish, retryOrFail) are handled by the caller.
 */

import { decodeTime } from 'ulid';
import { redisRepo } from './redis-repository';
import { redisKeys } from './redis-repository/keys';
import { DeviceMessage, NetworkServerImplementation, ParsedIncomingEvent, PULL_PATTERN_IMPLEMENTATIONS } from './types';

/** Maximum number of concurrent messages per gateway for PULL pattern. */
export const PULL_MAX_CONCURRENT_PER_GATEWAY = 5;

/** Maximum age for PULL pattern messages before they're considered timed out (48 hours). */
const PULL_PATTERN_MAX_MESSAGE_AGE_MS = 48 * 60 * 60 * 1000; // 172_800_000

/** Interface for PULL pattern adapters (polling-based). */
export interface PullIncomingAdapter {
  fetchStatus(message: DeviceMessage): Promise<ParsedIncomingEvent | null>;
}

/** Result of polling: a parsed event tied to its queue. */
export type PollResult = {
  parsedEvent: ParsedIncomingEvent;
  queueKey: string;
};

/** Result of a PULL pattern timeout: a failed message ready to publish. */
export type PullTimeoutResult = {
  message: Partial<DeviceMessage>;
};

/**
 * Calculate the next poll delay based on message age.
 * Older messages get polled less frequently.
 */
function getNextPollDelay(messageAgeMs: number): number {
  if (messageAgeMs < 20_000) return 10_000;   // 0-20s old: wait 10s
  if (messageAgeMs < 50_000) return 15_000;   // 20-50s old: wait 15s
  if (messageAgeMs < 90_000) return 20_000;   // 50-90s old: wait 20s
  return 30_000;                               // 90s+: wait 30s (cap)
}

/**
 * Poll a single PULL pattern implementation for status updates.
 * Only polls messages whose "next poll time" (score) has passed.
 *
 * Returns parsed events for completed messages. Pending messages
 * have their next poll time updated internally.
 *
 * @param implementation - The implementation to poll
 * @param adapter - The adapter for this implementation
 * @returns Array of poll results to process
 */
export async function pollImplementation(
  implementation: NetworkServerImplementation,
  adapter: PullIncomingAdapter,
): Promise<PollResult[]> {
  const queueKey = redisKeys.queueAwaitingTask(implementation);
  const messageIds = await redisRepo.getMessagesDueForPolling(queueKey);
  const results: PollResult[] = [];

  if (!adapter) return results;

  for (const messageId of messageIds) {
    const message = await redisRepo.getMessageById(messageId);
    // Guard: message might have been cleaned up or moved by reaper
    if (!message?.delivery_queue_id) continue;

    const parsedEvent = await adapter.fetchStatus(message);

    if (!parsedEvent) {
      // Still pending - update next poll time based on message age
      const now = Date.now();
      const messageAge = now - decodeTime(messageId);
      const nextPollAt = now + getNextPollDelay(messageAge);
      await redisRepo.updateNextPollTime(queueKey, messageId, nextPollAt);
      continue;
    }

    results.push({ parsedEvent, queueKey });
  }

  return results;
}

/**
 * Find PULL pattern messages that have exceeded their max age.
 * Cleans up timed-out messages and returns them for publishing.
 *
 * @param now - Current timestamp
 * @returns Array of failed messages to publish
 */
export async function getPullTimeouts(now: number): Promise<PullTimeoutResult[]> {
  const results: PullTimeoutResult[] = [];

  for (const implementation of PULL_PATTERN_IMPLEMENTATIONS) {
    const queueKey = redisKeys.queueAwaitingTask(implementation);
    // @SCALE :: Loads all message IDs at once. Fine for current volume (~500 max),
    // but if scale increases, switch to batched ZRANGE with LIMIT (not ZSCAN, which
    // is unsafe when mutating the set during iteration via messageFullCleanup).
    const messageIds = await redisRepo.getAllMessageIdsInQueue(queueKey);

    for (const messageId of messageIds) {
      // Use ULID timestamp to calculate message age
      const messageAge = now - decodeTime(messageId);
      if (messageAge < PULL_PATTERN_MAX_MESSAGE_AGE_MS) continue;

      const message = await redisRepo.getMessageById(messageId);
      if (!message) continue;

      // Permanent failure - no retry for PULL pattern timeouts
      await redisRepo.messageFullCleanup(message);
      results.push({
        message: {
          ...message,
          delivery_status: 'DELIVERY_FAILED',
          failure_history: [
            {
              timestamp: new Date(now).toISOString(),
              status: 'DELIVERED_TO_NS',
              reason: 'Timed out waiting for remote task completion',
              isFinal: true,
            },
            ...(message.failure_history ?? []),
          ],
        },
      });
    }
  }

  return results;
}
