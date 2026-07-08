import { Database as OriginalDatabase } from './supabase-types';

export type Database = OriginalDatabase & {
  public: OriginalDatabase['public'] & {
    Tables: OriginalDatabase['public']['Tables'] & {
      grids: OriginalDatabase['public']['Tables']['grids'] & {
        Row: OriginalDatabase['public']['Tables']['grids']['Row'] & {
          location_geom: {
            type: 'Point';
            coordinates: number[];
          } | null
        }
      };
      poles: OriginalDatabase['public']['Tables']['poles'] & {
        Row: OriginalDatabase['public']['Tables']['poles']['Row'] & {
          location_geom: {
            type: 'Point';
            coordinates: number[];
          }
        }
      };
    };
  };
};
