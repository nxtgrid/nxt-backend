import { Account } from '@core/modules/accounts/entities/account.entity';
import { Directive } from '@core/modules/directives/entities/directive.entity';
import { Meter } from '@core/modules/meters/entities/meter.entity';
import { Order } from '@core/modules/orders/entities/order.entity';
import { CoreEntity } from '@core/types/core-entity';
import { CurrencyEnum, MeterCreditTransferStatusEnum } from '@core/types/supabase-types';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne } from 'typeorm';

@Entity('meter_credit_transfers')
export class MeterCreditTransfer extends CoreEntity {

  @Column('varchar', { nullable: true })
    lock_session?: string;

  @Column('float')
    amount?: number;

  // @Column('enum', { enum: MeterCreditTransferStatusEnum, default: MeterCreditTransferStatusEnum.PENDING })
  @Column({ type: 'varchar' })
    meter_credit_transfer_status?: MeterCreditTransferStatusEnum;

  // Amount the sender meter is set to after the withdrawal is complete
  @Column('float', { nullable: true })
    sender_meter_set_to_amount?: number;

  // @Column({ type: 'enum', enum: CurrencyEnum })
  @Column({ type: 'varchar' })
    currency?: CurrencyEnum;

  @ManyToOne(() => Meter, meter => meter.sender_meter_credit_transfers)
  @JoinColumn({ name: 'sender_meter_id' })
    sender_meter?: Meter;

  @Column('int')
    sender_meter_id?: number;

  @ManyToOne(() => Meter, meter => meter.receiver_meter_credit_transfers)
  @JoinColumn({ name: 'receiver_meter_id' })
    receiver_meter?: Meter;

  @Column('int')
    receiver_meter_id?: number;

  // A credit transfer involves many directives
  @OneToMany(() => Directive, directive => directive.meter_credit_transfer)
    directives?: Directive[];

  // A credit transfer can only have one order
  @OneToOne(() => Order, order => order.meter_credit_transfer)
    order?: Order;

  // Author: who did it
  @ManyToOne(() => Account, author => author.meter_credit_transfers)
  @JoinColumn({ name: 'author_id' })
    author?: Account;
}
