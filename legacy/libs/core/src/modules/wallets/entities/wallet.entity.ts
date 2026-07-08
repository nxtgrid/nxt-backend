import { Entity, Column, OneToOne, OneToMany, JoinColumn } from 'typeorm';
import { CoreEntity } from '@core/types/core-entity';
import { Organization } from '@core/modules/organizations/entities/organization.entity';
import { Agent } from '@core/modules/agents/entities/agent.entity';
import { Transaction } from '@core/modules/transactions/entities/transactions.entity';
import { Order } from '@core/modules/orders/entities/order.entity';
import { Customer } from '@core/modules/customers/entities/customer.entity';
import { Meter } from '@core/modules/meters/entities/meter.entity';
import { Connection } from '@core/modules/connections/entities/connection.entity';
import { WalletTypeEnum } from '@core/types/supabase-types';

@Entity('wallets')
export class Wallet extends CoreEntity {
  @OneToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
    organization?: Organization;

  @Column('int', { nullable: true })
    organization_id?: number;

  @OneToOne(() => Agent)
  @JoinColumn({ name: 'agent_id' })
    agent?: Agent;

  @Column('int', { nullable: true })
    agent_id?: number;

  @OneToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
    customer?: Customer;

  @Column('int', { nullable: true })
    customer_id?: number;

  @OneToOne(() => Meter)
  @JoinColumn({ name: 'meter_id' })
    meter?: Meter;

  @Column('int', { nullable: true })
    meter_id?: number;

  @OneToOne(() => Connection)
  @JoinColumn({ name: 'connection_id' })
    connection?: Connection;

  @OneToMany(() => Transaction, transaction => transaction.wallet)
    transactions?: Transaction[];

  @OneToMany(() => Order, order => order.sender_wallet)
    sent_orders?: Order[];

  @OneToMany(() => Order, order => order.receiver_wallet)
    received_orders?: Order[];

  // This property is used in the transaction engine, to determine
  // whether a wallet can be used or not. it's a string and not a
  // boolean to be able to differentiate the sessions in which they
  // where locked for rollback purposes
  @Column('varchar', { nullable: true })
    lock_session?: string;

  @Column('float', { default: 0 })
    balance?: number;

  @Column({ type: 'timestamptz', nullable: true, precision: 3 })
    balance_updated_at?: Date;

  @Column('varchar', { nullable: true })
    identifier?: string;

  // @Column('enum', { enum: WalletTypeEnum, default: WalletTypeEnum.REAL })
  @Column('varchar')
    wallet_type?: WalletTypeEnum;

  @Column('int', { nullable: true })
    goldring_migration_id?: number;

  @Column('int', { nullable: true })
    rls_organization_id: number;
}
