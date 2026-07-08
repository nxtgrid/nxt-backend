import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne } from 'typeorm';

import { CoreEntity } from '@core/types/core-entity';
import { Wallet } from '@core/modules/wallets/entities/wallet.entity';
import { Transaction } from '@core/modules/transactions/entities/transactions.entity';
import { UssdSession } from '@core/modules/ussd-sessions/entities/ussd-session.entity';
import { Directive } from '@core/modules/directives/entities/directive.entity';
import { Account } from '@core/modules/accounts/entities/account.entity';
import { MeterCreditTransfer } from '@core/modules/meter-credit-transfers/entities/meter-credit-transfer.entity';
import { Grid } from '@core/modules/grids/entities/grid.entity';

import { AccountTypeEnum, CurrencyEnum, ExternalSystemEnum, MeterTypeEnum, OrderActorTypeEnum, OrderStatusEnum, OrderTypeEnum, PaymentChannelEnum, PaymentMethodEnum } from '@core/types/supabase-types';

@Entity('orders')
export class Order extends CoreEntity {
  @Column('float')
    amount?: number;

  @CreateDateColumn({ type: 'timestamptz', precision: 3, default: () => 'now()' })
    updated_at: Date;

  // @Column('enum', { enum: OrderStatusEnum, default: OrderStatusEnum.PENDING })
  @Column({ type: 'varchar' })
    order_status?: OrderStatusEnum;

  @Column('varchar', { nullable: true })
    lock_session?: string;

  @Column('varchar', { nullable: true })
    external_reference?: string;

  // @Column('enum', { enum: CurrencyEnum })
  @Column({ type: 'varchar' })
    currency?: CurrencyEnum;

  // @Column('enum', { enum: ExternalSystemEnum, nullable: true })
  @Column({ type: 'varchar' })
    external_system?: ExternalSystemEnum;

  // @Column('enum', { enum: MeterTypeEnum, nullable: true })
  @Column({ type: 'varchar' })
    tariff_type?: MeterTypeEnum;

  @Column('float', { default: -1 })
    tariff?: number;

  // @Column('enum', { enum: PaymentMethodEnum, nullable: true })
  @Column({ type: 'varchar' })
    payment_method?: PaymentMethodEnum;

  // @Column('enum', { enum: PaymentChannelEnum, nullable: true })
  @Column({ type: 'varchar' })
    payment_channel?: PaymentChannelEnum;


  /**
   * Relations
  **/

  // todo: remove the nullable. it's there because some of the initial transactions do not
  // have a sender, but those can just migrated so that they pull money from the external banking
  // system account (id: 966 in wallets table)
  @ManyToOne(() => Wallet, wallet => wallet.sent_orders)
  @JoinColumn({ name: 'sender_wallet_id' })
    sender_wallet?: Wallet;

  @ManyToOne(() => Wallet, wallet => wallet.sent_orders)
  @JoinColumn({ name: 'receiver_wallet_id' })
    receiver_wallet?: Wallet;

  @Column('int', { nullable: true })
    author_id?: number;

  @ManyToOne(() => Account, account => account.orders)
  @JoinColumn({ name: 'author_id' })
    author?: Account;

  @OneToMany(() => Transaction, transaction => transaction.order)
    transactions?: Transaction[];

  @OneToMany(() => Directive, directive => directive.order)
    directives?: Directive[];

  @OneToOne(() => Directive)
  @JoinColumn({ name: 'directive_id' })
    directive?: Directive;

  @Column('int', { nullable: true })
    directive_id?: number;

  @OneToOne(() => UssdSession)
  @JoinColumn({ name: 'ussd_session_id' })
    ussd_session?: UssdSession;

  @Column('int', { nullable: true })
    meter_credit_transfer_id?: number;

  @OneToOne(() => MeterCreditTransfer)
  @JoinColumn({ name: 'meter_credit_transfer_id' })
    meter_credit_transfer?: MeterCreditTransfer;

  // Historical fields are fields that represent a historical link between two entities.
  // For example, in this case a meter might have been uninstalled from a grid, so by the time
  // we run the query, it might be that the order cannot be traced back to the grid anymore
  @ManyToOne(() => Grid, grid => grid.historical_orders)
  @JoinColumn({ name: 'historical_grid_id' })
    historical_grid?: Grid;

  @Column('int', { nullable: true })
    historical_grid_id?: number;

  // @Column('enum', { enum: AccountTypeEnum, nullable: true })
  @Column({ type: 'varchar' })
    meta_author_type?: AccountTypeEnum;

  @Column('varchar', { nullable: true })
    meta_author_name?: string;

  @Column('int', { nullable: true })
    meta_author_id?: number;

  // Meta fields are fields that make it easier to run queries. In theory, the value
  // can still be derived from the a query, but in order to make querying easier, we
  // spread the complexity across more fields
  // @Column('enum', { enum: OrderTypeEnum, nullable: true })
  @Column({ type: 'varchar' })
    meta_order_type?: OrderTypeEnum;

  @Column('int', { nullable: true })
    meta_sender_id?: number;

  @Column('varchar', { nullable: true })
    meta_sender_name?: string;

  @Column('varchar', { nullable: true })
    meta_receiver_name?: string;

  // This is needed to keep track of the customer to which the meter belongs
  @Column('varchar', { nullable: true })
    meta_receiver_name_part_2?: string;

  // This is needed to keep track of the customer to which the connection belongs
  @Column('varchar', { nullable: true })
    meta_sender_name_part_2?: string;

  @Column('int', { nullable: true })
    meta_receiver_id?: number;

  @Column('int', { nullable: true })
    meta_receiver_id_part_2?: number;

  // @Column('enum', { enum: OrderActorTypeEnum, nullable: true })
  @Column({ type: 'varchar' })
    meta_sender_type?: OrderActorTypeEnum;

  // @Column('enum', { enum: OrderActorTypeEnum, nullable: true })
  @Column({ type: 'varchar' })
    meta_receiver_type?: OrderActorTypeEnum;

  @Column('boolean', { nullable: true })
    meta_is_hidden_from_reporting?: boolean;

  @Column('int', { nullable: true })
    rls_organization_id: number;
}
