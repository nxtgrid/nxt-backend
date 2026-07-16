/**
 * Augmented `Database` type — PostGIS `location_geom` as GeoJSON `Point` where the generator
 * emits `unknown`.
 *
 * **Import convention (002d):**
 * - `Database` → `@nxt/core/types/supabase-types-adjusted` (this module)
 * - Enums, row/insert/update aliases, `Json`, etc. → `@nxt/core/types/supabase-types`
 */
import { Database as OriginalDatabase } from './supabase-types.js';

export type Database = OriginalDatabase & {
  public: OriginalDatabase['public'] & {
    Tables: OriginalDatabase['public']['Tables'] & {
      grids: OriginalDatabase['public']['Tables']['grids'] & {
        Row: OriginalDatabase['public']['Tables']['grids']['Row'] & {
          location_geom: {
            type: 'Point';
            coordinates: number[];
          } | null;
        };
      };
      poles: OriginalDatabase['public']['Tables']['poles'] & {
        Row: OriginalDatabase['public']['Tables']['poles']['Row'] & {
          location_geom: {
            type: 'Point';
            coordinates: number[];
          };
        };
      };
    };
  };
};
