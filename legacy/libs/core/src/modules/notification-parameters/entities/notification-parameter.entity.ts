import { Notification } from '@core/modules/notifications/entities/notification.entity';
import { CoreEntity } from '@core/types/core-entity';
import { Column, Entity, OneToMany } from 'typeorm';

@Entity('notification_parameters')
export class NotificationParameter extends CoreEntity {
  // the maximum size of a json document in a row is 1GB, which should be sustainable,
  // since an email will never contain more than a few tens of grids, agents or grid
  // managers
  @Column({ type: 'json', nullable: true })
    parameters: string;

  @OneToMany(() => Notification, notification => notification.notification_parameter)
    notifications: Notification[];
}
