import { PartialType } from '@nestjs/mapped-types';
import { CreateMeterInput } from './create-meter.input';

export class UpdateMeterInput extends PartialType(CreateMeterInput) {
  id: number;
}
