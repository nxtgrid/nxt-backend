/**
 * @fileoverview Retry logic utilities for device message delivery.
 */

/** Maximum number of retries before permanent failure.
 *  Total number of attempts will be n + 1 (the original try)
 *  With 11 retries in an exponential sequence and base delay
 *  of 2 seconds, we end up at about 1h 8 minutes of retrying */
export const MAX_RETRIES = 11;

/** Base delay for first retry attempt. */
const RETRY_BASE_DELAY_MS = 2_000;

/** Multiplier for exponential backoff. */
const RETRY_BACKOFF_MULTIPLIER = 2;

/** Maximum delay cap to prevent excessive wait times. */
const RETRY_MAX_DELAY_MS = 3_600_000; // 1 hour

/**
 * Calculate the delay before the next retry using exponential backoff.
 *
 * Formula: (2 ^ retryCount) * 2000ms, capped at 1 hour, plus 0-50% jitter.
 *
 * Example delays (before jitter):
 * - Attempt 0 (first fail): 2^0 * 2000 = 2 seconds
 * - Attempt 1: 2^1 * 2000 = 4 seconds
 * - Attempt 2: 2^2 * 2000 = 8 seconds
 * - Attempt 3: 2^3 * 2000 = 16 seconds
 *
 * @param retryCount - Number of previous retry attempts (0 = first failure)
 * @returns Delay in milliseconds before next retry
 */
export const calculateBackoffDelay = (retryCount: number): number => {
  // 1. Exponential Calculation
  const delay = RETRY_BASE_DELAY_MS * Math.pow(RETRY_BACKOFF_MULTIPLIER, retryCount);

  // 2. Safety Cap (Prevent waiting forever)
  const cappedDelay = Math.min(delay, RETRY_MAX_DELAY_MS);

  // 3. Add jitter (0-50%) to prevent thundering herd
  const jitter = Math.floor(Math.random() * (cappedDelay * 0.5));

  return cappedDelay + jitter;
};
