import { PartialType } from '@nestjs/mapped-types';
import { CreateMeterCommissioningInput } from './create-meter-commissioning.input';

export class UpdateMeterCommissioningInput extends PartialType(CreateMeterCommissioningInput) {
  id?: number;
}
