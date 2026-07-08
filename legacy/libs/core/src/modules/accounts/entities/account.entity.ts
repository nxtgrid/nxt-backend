import { Column, DeleteDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne } from 'typeorm';
import { CoreEntity } from '@core/types/core-entity';
import { Agent } from '@core/modules/agents/entities/agent.entity';
import { Customer } from '@core/modules/customers/entities/customer.entity';
import { UssdSession } from '@core/modules/ussd-sessions/entities/ussd-session.entity';
import { Organization } from '@core/modules/organizations/entities/organization.entity';
import { Order } from '@core/modules/orders/entities/order.entity';
import { DirectiveBatch } from '../../directive-batches/entities/directive-batch.entity';
// import { Audit } from '@core/modules/audits/entities/audit.entity';
import { Directive } from '@core/modules/directives/entities/directive.entity';
import { MeteringHardwareInstallSession } from '@core/modules/metering-hardware-install-sessions/entities/metering-hardware-install-session.entity';
import { ApiKey } from '@core/modules/api-keys/entities/api-key.entity';
import { Note } from '@core/modules/notes/entities/note.entity';
import { Payout } from '@core/modules/payouts/entities/payout.entity';
import { MeterCreditTransfer } from '@core/modules/meter-credit-transfers/entities/meter-credit-transfer.entity';
import { Notification } from '@core/modules/notifications/entities/notification.entity';
import { Member } from '@core/modules/members/entities/member.entity';

@Entity('accounts')
export class Account extends CoreEntity {
  @OneToOne(() => Agent, agent => agent.account)
    agent?: Agent;

  @OneToOne(() => Customer, customer => customer.account)
    customer?: Customer;

  @OneToOne(() => Member, member => member.account)
    member?: Member;

  @Column('varchar', { nullable: true })
    supabase_id?: string;

  @Column('varchar', { nullable: true })
    full_name?: string;

  @Column('varchar', { nullable: true })
    email?: string;

  @Column('varchar', { nullable: true })
    phone?: string;

  @Column('varchar', { nullable: true, unique: true })
    telegram_id?: string;

  @Column('varchar', { nullable: true, unique: true })
    telegram_link_token?: string;

  @ManyToOne(() => Organization, organization => organization.accounts)
  @JoinColumn({ name: 'organization_id' })
    organization?: Organization;

  @OneToMany(() => UssdSession, ussdSession => ussdSession.account)
    ussd_sessions?: UssdSession[];

  @OneToMany(() => Order, order => order.author)
    orders?: Order[];

  @OneToMany(() => DirectiveBatch, tou_rule => tou_rule.author)
    tou_rules?: DirectiveBatch[];

  @DeleteDateColumn({ type: 'timestamp', precision: 3, nullable: true })
    deleted_at?: Date;

  // @OneToMany(() => Audit, audit => audit.author)
  //   audits?: Audit[];

  @OneToMany(() => Directive, directive => directive.author)
    directives?: Directive[];

  @OneToMany(() => MeteringHardwareInstallSession, metering_hardware_install_session => metering_hardware_install_session.author)
    metering_hardware_install_sessions?: MeteringHardwareInstallSession[];

  @OneToMany(() => MeterCreditTransfer, meter_credit_transfer => meter_credit_transfer.author)
    meter_credit_transfers?: MeterCreditTransfer[];

  @OneToMany(() => ApiKey, api_key => api_key.account)
    api_keys?: ApiKey[];

  @OneToMany(() => Note, note => note.author)
    notes?: Note[];

  @OneToMany(() => Payout, payout => payout.approved_by)
    payouts?: Payout[];

  @OneToMany(() => Notification, notification => notification.account)
    notifications?: Notification[];
}
