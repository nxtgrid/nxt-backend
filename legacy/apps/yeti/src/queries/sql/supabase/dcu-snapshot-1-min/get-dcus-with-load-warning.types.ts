import { DirectiveStatusEnum } from '@core/types/supabase-types';

/**
 * Query parameters for get-dcus-with-load-warning.sql
 */
export type DcuWithLoadWarningParams = [
  directiveStatus1: DirectiveStatusEnum,
  directiveStatus2: DirectiveStatusEnum,
  directiveStatus3: DirectiveStatusEnum,
];

/**
 * Result type for get-dcus-with-load-warning.sql
 *
 * Returns DCU load status information, indicating whether each DCU is operating
 * under its queue capacity threshold. Used to compute the grid-level field
 * `are_all_dcus_under_high_load_threshold` via AND logic across all DCUs.
 */
export type DcuWithLoadWarning = {
  /** Grid ID that this DCU belongs to */
  grid_id: number;
  /** DCU database ID */
  dcu_id: number;
  /** True if DCU is UNDER threshold (has available queue capacity), False if at/over capacity */
  is_high_load_threshold_hit: boolean;
};

