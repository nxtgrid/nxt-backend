import { readFileSync } from 'fs';
import * as path from 'path';

/**
 * Loads a SQL or Lua query file from the app's queries directory.
 *
 * At build time, each app's query files are copied to `dist/apps/{app}/queries/`.
 * The webpack bundler resolves `__dirname` to the calling module's directory,
 * allowing this function to find the queries relative to each app's build output.
 *
 * @param queryPath - Path to the query file relative to the queries folder
 *                    (e.g., 'sql/supabase/dcus/find-status-by-grid.sql')
 * @returns The contents of the query file as a string
 *
 * @example
 * // In apps/myapp/src/queries/index.ts
 * import { loadQuery } from '@helpers/query-helpers';
 * const myQuery = loadQuery('sql/supabase/my-module/my-query.sql');
 */
export const loadQuery = (queryPath: string): string => {
  const absolutePath = path.join(__dirname, 'queries', queryPath);
  return readFileSync(absolutePath, 'utf8');
};
