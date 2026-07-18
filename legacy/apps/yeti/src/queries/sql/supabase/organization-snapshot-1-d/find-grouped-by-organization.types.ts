/**
 * Query parameters for find-grouped-by-organization.sql
 */
export type GridCountByOrganizationParams = [
  isHiddenFromReporting: boolean,
];

/**
 * Result type for find-grouped-by-organization.sql
 *
 * Returns the count of grids per organization, filtered by reporting visibility status.
 * Only includes non-deleted grids. Used for creating daily organization snapshots
 * to track organizational metrics over time.
 */
export type GridCountByOrganization = {
  /** Organization database ID */
  organization_id: number;
  /** Organization name (null if organization not found or deleted) */
  organization_name: string | null;
  /** Number of grids belonging to this organization matching the filter criteria */
  grid_count: number;
};

