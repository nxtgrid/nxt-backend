import { MeterInteractionStatusEnum } from '@core/types/supabase-types';

/**
 * Status arrays to aggregate statuses into more usable subsets
**/

export const toAdjudicatePendingStatuses = [ 'QUEUED', 'SUSPENDED' ] satisfies MeterInteractionStatusEnum[];
export const pendingStatuses = [ ...toAdjudicatePendingStatuses, 'DEFERRED' ] satisfies MeterInteractionStatusEnum[];
export const processingStatuses = [ 'PROCESSING' ] satisfies MeterInteractionStatusEnum[];
export const successfulStatuses = [ 'SUCCESSFUL' ] satisfies MeterInteractionStatusEnum[];
export const failedStatuses = [ 'FAILED', 'ABORTED' ] satisfies MeterInteractionStatusEnum[];

export const unfinishedStatuses = [ ...pendingStatuses, ...processingStatuses ];

/**
 * Some complex typing to ensure that:
 *   - we never have an extra or wrong value in our statuses
 *   - we never have a value missing that was newly added to db
**/

// Union of all statuses in arrays
type AllMeterInteractionStatuses =
  | typeof pendingStatuses[number]
  | typeof processingStatuses[number]
  | typeof successfulStatuses[number]
  | typeof failedStatuses[number];

// Detect missing enum values
type MissingStatuses = Exclude<MeterInteractionStatusEnum, AllMeterInteractionStatuses>;

// Force compile-time error if any
// ⚠️ If the following type fails, it means that a new value was added  ⚠️
// ⚠️ to the MeterInteractionStatus enum and we haven't handled it here ⚠️
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type checkAllStatusesAreCovered = AssertNever<MissingStatuses>;

const isStatusIn =
  <const T extends readonly MeterInteractionStatusEnum[]>(group: T) =>
    (status: MeterInteractionStatusEnum): status is T[number] => group.includes(status as T[number]);

export const isMeterInteractionStatusToAdjudicate = isStatusIn(toAdjudicatePendingStatuses);
export const isMeterInteractionStatusPending = isStatusIn(pendingStatuses);
export const isMeterInteractionStatusProcessing = isStatusIn(processingStatuses);
export const isMeterInteractionStatusSuccessful = isStatusIn(successfulStatuses);
export const isMeterInteractionStatusFailed = isStatusIn(failedStatuses);


/**
 * Status count map
 * Used to calculate the progress of a batch execution (scans, fs control, etc.)
**/

export const createBatchStatusCountMap = (interactions: { meter_interaction_status: MeterInteractionStatusEnum }[]) =>
  interactions.reduce((accObj, { meter_interaction_status }) => {
    // @PERFORMANCE :: Doing direct mutation because faster
    if (isMeterInteractionStatusPending(meter_interaction_status)) {
      accObj.pending++;
    }
    else if (isMeterInteractionStatusSuccessful(meter_interaction_status)) {
      accObj.successful++;
    }
    else if (isMeterInteractionStatusFailed(meter_interaction_status)) {
      accObj.failed++;
    }
    else {
      accObj.processing++;
    }
    return accObj;
  }, {
    pending: 0,
    successful: 0,
    failed: 0,
    processing: 0,
  });
