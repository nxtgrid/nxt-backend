import { PartialType } from '@nestjs/mapped-types';
import { CreateIssueInput } from './create-issue.input';

export class UpdateIssueInput extends PartialType(CreateIssueInput) {
  id: number;
}
