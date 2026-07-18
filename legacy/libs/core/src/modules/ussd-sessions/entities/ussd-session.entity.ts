import { UssdSessionHop } from '@core/modules/ussd-session-hops/entities/ussd-session-hop.entity';
import { Entity, Column, OneToMany, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import { CoreEntity } from '@core/types/core-entity';
import { Account } from '@core/modules/accounts/entities/account.entity';
import { Meter } from '@core/modules/meters/entities/meter.entity';
import { Bank } from '@core/modules/banks/entities/bank.entity';
import { Order } from '@core/modules/orders/entities/order.entity';
import { ExternalSystemEnum } from '@core/types/supabase-types';

@Entity('ussd_sessions')
export class UssdSession extends CoreEntity {
  @Column('varchar')
    phone: string;

  @Column('float', { nullable: true })
    amount: number;

  @Column('varchar', { nullable: true })
    external_reference: string;

  @OneToMany(
    () => UssdSessionHop,
    ussdSessionHop => ussdSessionHop.ussd_session,
  )
    ussd_session_hops: UssdSessionHop[];

  // @Column('enum', { enum: ExternalSystemEnum })
  @Column({ type: 'varchar' })
    external_system: ExternalSystemEnum;

  @ManyToOne(() => Account, account => account.ussd_sessions)
  @JoinColumn({ name: 'account_id' })
    account: Account;

  @ManyToOne(() => Meter, meter => meter.ussd_sessions)
  @JoinColumn({ name: 'meter_id' })
    meter: Meter;

  @ManyToOne(() => Bank, bank => bank.ussd_sessions)
  @JoinColumn({ name: 'bank_id' })
    bank: Bank;

  @Column('bool', { default: false })
    is_using_other_option: boolean;

  @OneToOne(() => Order, order => order.ussd_session)
    order: Order;
}
