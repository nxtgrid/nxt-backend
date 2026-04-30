import { Entity, Column, PrimaryGeneratedColumn, JoinColumn, ManyToOne, Index } from 'typeorm';
import { Wallet } from '@core/modules/wallets/entities/wallet.entity';
import { Order } from '@core/modules/orders/entities/order.entity';
import { TransactionStatusEnum } from '@core/types/supabase-types';

@Entity('transactions')
@Index([ 'wallet', 'transaction_status', 'created_at' ])
export class Transaction {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
    id: number;

  @Column({ type: 'timestamptz', default: () => 'now()', precision: 3 })
    created_at: Date;

  @Column('float')
    amount: number;

  @ManyToOne(() => Wallet, wallet => wallet.transactions)
  @JoinColumn({ name: 'wallet_id' })
    wallet: Wallet;

  @ManyToOne(() => Order, order => order.transactions)
  @JoinColumn({ name: 'order_id' })
    order: Order;

  // @Column('enum', { enum: TransactionStatusEnum })
  @Column({ type: 'varchar' })
    transaction_status: TransactionStatusEnum;

  @Column('float', { default: -1 })
    balance_before: number;

  @Column('float', { default: -1 })
    balance_after: number;
}
