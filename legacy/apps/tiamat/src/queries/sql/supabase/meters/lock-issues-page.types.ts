/**
 * Query parameters for lock-issues-page.sql
 */
export type LockIssuesPageParams = [
  executionSession: string,
  currentTimestamp: Date,
  lastCheckedBefore: Date,
  limit: number,
];

/**
 * Result type for lock-issues-page.sql
 *
 * Locks a page of meters for issue checking by assigning them to an execution session.
 * Only selects meters that have a connection, customer, and grid assignment, and haven't
 * been checked recently (or never checked).
 */
export type LockIssuesPageResult = void;

