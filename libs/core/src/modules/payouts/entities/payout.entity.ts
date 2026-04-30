import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { CoreEntity } from '@core/types/core-entity';
import { BankAccount } from '@core/modules/bank-accounts/entities/bank-account.entity';
import { Grid } from '@core/modules//grids/entities/grid.entity';
import { Account } from '@core/modules//accounts/entities/account.entity';
import { ExternalSystemEnum, PayoutStatusEnum } from '@core/types/supabase-types';

@Entity('payouts')
export class Payout extends CoreEntity {
  @Column('float')
    proposed_amount: number;

  @Column('float', { nullable: true })
    approved_amount: number;

  @Column('varchar', { nullable: true })
    external_reference: string;

  // @Column('enum', { enum: ExternalSystemEnum, nullable: true })
  @Column({ type: 'varchar' })
    external_system: ExternalSystemEnum;

  // @Column({ type: 'enum', enum: PayoutStatusEnum })
  @Column({ type: 'varchar' })
    payout_status: PayoutStatusEnum;

  @Column('varchar', { nullable: true })
    draft_link: string;

  @Column({ type: 'timestamptz', precision: 3 })
    started_at: Date;

  @Column({ type: 'timestamptz', precision: 3 })
    ended_at: Date;

  /**
   * Relations
  **/

  @ManyToOne(() => BankAccount, bank_account => bank_account.payouts)
  @JoinColumn({ name: 'bank_account_id' })
    bank_account: BankAccount;

  @Column('int')
    grid_id: number;

  @ManyToOne(() => Grid, grid => grid.payouts)
  @JoinColumn({ name: 'grid_id' })
    grid: Grid;

  @ManyToOne(() => Account, account => account.payouts)
  @JoinColumn({ name: 'approved_by_account_id' })
    approved_by: Account;

   @Column({ type: 'json', nullable: true })
     details;
}
