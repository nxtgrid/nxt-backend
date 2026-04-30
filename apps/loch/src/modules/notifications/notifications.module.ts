import { Global, Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { Notification } from '@core/modules/notifications/entities/notification.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './notifications.controller';

@Global()
@Module({
  imports: [ TypeOrmModule.forFeature([ Notification ]) ],
  providers: [ NotificationsService ],
  controllers: [ NotificationsController ],
  exports: [ NotificationsService ],
})
export class NotificationsModule {}
