-- Count grids grouped by organization, filtered by reporting visibility
-- Only includes non-deleted grids, used for organization snapshot reports
-- Returns grid counts per organization for daily snapshots

SELECT
  grids.organization_id,
  organizations.name AS organization_name,
  COUNT(*) AS grid_count
FROM grids
LEFT JOIN organizations ON organizations.id = grids.organization_id
WHERE
  grids.deleted_at IS NULL
  AND grids.is_hidden_from_reporting = $1
GROUP BY grids.organization_id, organizations.name;

