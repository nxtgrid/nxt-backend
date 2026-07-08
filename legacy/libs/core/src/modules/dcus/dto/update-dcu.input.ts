import { PartialType } from '@nestjs/mapped-types';
import { CreateDcuInput } from './create-dcu.input';

export class UpdateDcuInput extends PartialType(CreateDcuInput) {
  id: number;
}
