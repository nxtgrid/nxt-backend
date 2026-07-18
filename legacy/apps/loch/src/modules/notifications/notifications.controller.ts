import { Body, Controller, Post, Put } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { UpdateNotificationInput } from '@core/modules/notifications/dto/update-notification.input';
import { CreateNotificationInput } from '@core/modules/notifications/dto/create-notification.input';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
  ) { }

  @Put()
  updateNotification(@Body() updateNotificationsInput: UpdateNotificationInput) {
    return this.notificationsService.update(updateNotificationsInput.id, updateNotificationsInput);
  }

  @Post()
  createNotifications(@Body() createNotificationsInput: CreateNotificationInput[]) {
    return this.notificationsService.create(createNotificationsInput);
  }
}
