import { IssueTypeEnum } from '@core/types/supabase-types';
import { toSafeNumberOrZero } from '@helpers/number-helpers';

const METER_ISSUE_TYPE_MAP: Record<string, IssueTypeEnum> = {
  no_communication_issue_count: 'NO_COMMUNICATION',
  no_credit_issue_count: 'NO_CREDIT',
  no_consumption_issue_count: 'NO_CONSUMPTION',
  not_activated_issue_count: 'METER_NOT_ACTIVATED',
  tamper_issue_count: 'TAMPER',
  power_limit_breached_issue_count: 'POWER_LIMIT_BREACHED',
  over_voltage_issue_count: 'OVER_VOLTAGE',
  low_voltage_issue_count: 'LOW_VOLTAGE',
  unexpected_power_limit_issue_count: 'UNEXPECTED_POWER_LIMIT',
  unexpected_meter_status_issue_count: 'UNEXPECTED_METER_STATUS',
};

/**
 * Builds an object with issue counts from an array of grouped meter issues.
 * Uses METER_ISSUE_TYPE_MAP as the source of truth to ensure every property
 * in the map is present in the returned object with a number value (defaults to 0).
 *
 * @param meterGroupsByIssue - Array of objects with issue_type and count (already filtered by grid)
 * @returns An object with property names from METER_ISSUE_TYPE_MAP and their corresponding counts
 */

type IssueTypeCountMap = Record<keyof typeof METER_ISSUE_TYPE_MAP, number>;

export const buildIssueCounts = (meterGroupsByIssue: {
  issue_type: IssueTypeEnum;
  count: number
}[]): IssueTypeCountMap => {
  const issueTypeToCountMap = new Map<IssueTypeEnum, number>();
  for (const group of meterGroupsByIssue) {
    issueTypeToCountMap.set(group.issue_type, group.count);
  }

  const result: IssueTypeCountMap = {};
  for (const [ propertyName, issueType ] of Object.entries(METER_ISSUE_TYPE_MAP)) {
    const rawCount = issueTypeToCountMap.get(issueType);
    result[propertyName] = toSafeNumberOrZero(rawCount);
  }

  return result;
};
