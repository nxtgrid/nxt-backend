import { ExternalSystemEnum } from '@core/types/supabase-types';

export class CreateRouterInput {

  external_reference: string;

  grid_id: number;

  external_system: ExternalSystemEnum;

  deleted_at?: Date;

  is_online?: boolean;

  is_online_updated_at?: Date;
}
