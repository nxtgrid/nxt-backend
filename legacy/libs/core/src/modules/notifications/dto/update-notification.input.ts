import { PartialType } from '@nestjs/mapped-types';
import { CreateNotificationInput } from './create-notification.input';
import { IsIn } from 'class-validator';
import { Constants, NotificationStatusEnum } from '@core/types/supabase-types';

export class UpdateNotificationInput extends PartialType(CreateNotificationInput) {
  id: number;

  @IsIn(Constants.public.Enums.notification_status_enum)
    notification_status?: NotificationStatusEnum;
}
