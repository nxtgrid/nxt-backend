import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { CoreEntity } from '@core/types/core-entity';
import { Grid } from '@core/modules/grids/entities/grid.entity';
import { Organization } from '@core/modules/organizations/entities/organization.entity';
import { NotificationParameter } from '@core/modules/notification-parameters/entities/notification-parameter.entity';
import { Account } from '@core/modules/accounts/entities/account.entity';
import { ExternalSystemEnum, NotificationStatusEnum, NotificationTypeEnum } from '@core/types/supabase-types';

// todo: maybe we can add an account id, so if at some point we want to track who the email
// was sent to in our system we can do it?
@Index([ 'notification_status' ])
@Entity('notifications')
export class Notification extends CoreEntity {
  // @Column('enum', { enum: ExternalSystemEnum, nullable: true })
  @Column({ type: 'varchar' })
    connector_external_system: ExternalSystemEnum; // make.com vs flow_xo

  // @Column('enum', { enum: ExternalSystemEnum, nullable: true })
  @Column({ type: 'varchar' })
    carrier_external_system: ExternalSystemEnum; // telegram vs sms vs whatsapp

  // @Column('enum', { enum: NotificationTypeEnum })
  @Column({ type: 'varchar' })
    notification_type: NotificationTypeEnum;

  // @Column('enum', { enum: NotificationStatusEnum })
  @Column({ type: 'varchar' })
    notification_status: NotificationStatusEnum;

  @Column('varchar', { nullable: true })
    external_reference: string;

  @ManyToOne(() => Grid, grid => grid.notifications)
  @JoinColumn({ name: 'grid_id' })
    grid: Grid;

  @ManyToOne(() => Organization, organization => organization.notifications)
  @JoinColumn({ name: 'organization_id' })
    organization: Organization;

  @ManyToOne(() => Account, account => account.notifications)
  @JoinColumn({ name: 'account_id' })
    account?: Account;

  @Column('int', { nullable: true })
    notification_parameter_id: number;

  // points the the parameters templating (eg email revenue report)
  @ManyToOne(() => NotificationParameter, notificationParameter => notificationParameter.notifications)
  @JoinColumn({ name: 'notification_parameter_id' })
    notification_parameter: NotificationParameter;

  @Column('int', { nullable: true })
    grid_id: number;

  @Column('int', { nullable: true })
    organization_id: number;

  @Column('int', { nullable: true })
    account_id: number;

  @Column('varchar', { nullable: true })
    lock_session: string;

  @Column('varchar', { nullable: true })
    message: string;

  // sms field
  @Column('varchar', { nullable: true })
    phone: string;

  // email field
  @Column('varchar', { nullable: true })
    subject: string;

  // email field
  @Column('varchar', { nullable: true })
    email: string;

  @Column('varchar', { nullable: true })
    chat_id: string;

  @Column('varchar', { nullable: true })
    thread_id: string;
}
