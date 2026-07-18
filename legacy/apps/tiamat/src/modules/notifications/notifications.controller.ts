import { Body, Controller, Post, Put, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationInput } from '@core/modules/notifications/dto/create-notification.input';
import { UpdateNotificationInput } from '@core/modules/notifications/dto/update-notification.input';
import { AuthenticationGuard } from '../auth/authentication.guard';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
  ) { }

  @Put()
  @UseGuards(AuthenticationGuard)
  updateNotification(
    @Body() updateNotificationInput: UpdateNotificationInput,
  ) {
    return this.notificationsService.update(updateNotificationInput);
  }

  // Used by Google Apps Script
  @Post()
  @UseGuards(AuthenticationGuard)
  createNotifications(
    @Body() createNotificationsInput: CreateNotificationInput[],
  ) {
    return this.notificationsService.create(createNotificationsInput);
  }

  // @SECURITY :: Public endpoint
  @Post('site-submission')
  createSiteSubmissionEmail(
    @Body() { message },
  ) {
    return this.notificationsService.create([ {
      carrier_external_system: 'SENDGRID',
      notification_type: 'SITE_SUBMISSION',
      email: 'info+sitesubmission@nxtgrid.co',
      subject: 'New site submission',
      message,
    } ]);
  }
}
