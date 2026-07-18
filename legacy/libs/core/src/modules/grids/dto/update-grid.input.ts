import { PartialType } from '@nestjs/mapped-types';
import { CreateGridInput } from './create-grid.input';

export class UpdateGridInput extends PartialType(CreateGridInput) {
  id: number;

  generation_gateway_last_seen_at?: Date;
}
