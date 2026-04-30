import { Global, Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from '@core/modules/notifications/entities/notification.entity';

@Global()
@Module({
  imports: [ TypeOrmModule.forFeature([ Notification ]) ],
  controllers: [ NotificationsController ],
  providers: [ NotificationsService ],
  exports: [ NotificationsService ],
})
export class NotificationsModule {}
