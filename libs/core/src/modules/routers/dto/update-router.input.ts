import { PartialType } from '@nestjs/mapped-types';
import { CreateRouterInput } from './create-router.input';

export class UpdateRouterInput extends PartialType(CreateRouterInput) {
  id: number;
}
