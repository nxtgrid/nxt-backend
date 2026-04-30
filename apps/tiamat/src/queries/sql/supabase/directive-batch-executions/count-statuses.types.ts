/**
 * Result of the count-statuses query
 * Aggregates status counts from meter interactions
 */
export type BatchExecutionStatusCounts = {
  pending: number;
  processing: number;
  successful: number;
  failed: number;
}

/**
 * Parameters for the count-statuses query
 * @param executionId - The batch_execution_id to count statuses for
 * @param pendingStatuses - Array of pending status values (e.g., ['QUEUED', 'DEFERRED', 'SUSPENDED'])
 * @param processingStatuses - Array of processing status values (e.g., ['PROCESSING'])
 * @param successfulStatuses - Array of successful status values (e.g., ['SUCCESSFUL'])
 * @param failedStatuses - Array of failed status values (e.g., ['FAILED', 'ABORTED'])
 */
export type BatchExecutionStatusCountsParams = [
  executionId: number,
  pendingStatuses: string[],
  processingStatuses: string[],
  successfulStatuses: string[],
  failedStatuses: string[],
];

