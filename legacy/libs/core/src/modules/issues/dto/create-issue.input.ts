import { Meter } from '@core/modules/meters/entities/meter.entity';
import { Mppt } from '@core/modules/mppts/entities/mppt.entity';
import { Grid } from '@core/modules/grids/entities/grid.entity';
import { IssueStatusEnum, IssueTypeEnum } from '@core/types/supabase-types';

export class CreateIssueInput {
  grid_id?: number;
  issue_type?: IssueTypeEnum;
  issue_status: IssueStatusEnum;

  // this is the only thing can be changed from the frontend
  // @Field(() => String, { nullable: true })
  snoozed_until?: Date;
  meter?: Meter;
  mppt?: Mppt;
  grid?: Grid;
  closed_at?: Date;
  external_reference?: string;

  estimated_lost_revenue?: number;
}
