import { PartialType } from '@nestjs/mapped-types';
import { CreateNotificationParameterInput } from './create-notification-parameter.input';

export class UpdateNotificationParameterInput extends PartialType(CreateNotificationParameterInput) {}
