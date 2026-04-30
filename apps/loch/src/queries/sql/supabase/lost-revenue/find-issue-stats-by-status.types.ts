import { IssueStatusEnum, MeterTypeEnum } from '@core/types/supabase-types';

/**
 * Query parameters for find-issue-stats-by-status.sql
 * Note: This query is currently unused (service is commented out).
 */
export type IssueStatsByStatusParams = [
  issueStatus: IssueStatusEnum,
  limit: number,
  offset: number,
];

/**
 * Result type for find-issue-stats-by-status.sql
 *
 * Returns issue statistics used for lost revenue calculations.
 * Includes the number of hours the issue has been open.
 *
 * Note: This query is currently unused (service is commented out).
 */
export type IssueStatsByStatus = {
  /** Issue ID */
  id: number;
  /** When the issue was created */
  created_at: string;
  /** When the issue was closed (null if still open) */
  closed_at: string | null;
  /** Hours since issue was created */
  hours: number;
  /** Grid ID where the meter is located */
  grid_id: number;
  /** Type of meter (HPS or FS) */
  meter_type: MeterTypeEnum;
};

