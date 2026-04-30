import { Entity, Column, OneToMany, OneToOne } from 'typeorm';
import { Grid } from '@core/modules/grids/entities/grid.entity';
import { Wallet } from '@core/modules/wallets/entities/wallet.entity';
import { CoreEntity } from '@core/types/core-entity';
import { Account } from '@core/modules/accounts/entities/account.entity';
// import { Audit } from '@core/modules/audits/entities/audit.entity';
import { BankAccount } from '@core/modules/bank-accounts/entities/bank-account.entity';
import { Notification } from '@core/modules/notifications/entities/notification.entity';

@Entity('organizations')
export class Organization extends CoreEntity {

  @Column('varchar')
    name?: string;  // Why optional if required?

  @Column('varchar', { nullable: true })
    formal_name?: string;  // Why optional if required?

  @Column('varchar', { nullable: true })
    email?: string;

  @Column('varchar', { nullable: true })
    phone?: string;

  @Column('varchar', { nullable: true })
    address?: string;

  @Column('varchar', { nullable: true })
    epicollect_contract_survey_slug?: string;

  @Column('varchar', { nullable: true })
    epicollect_contract_survey_secret?: string;

  @Column('varchar', { nullable: true })
    epicollect_contract_survey_client_id?: string;

  @Column({ type: 'timestamptz', nullable: true, precision: 3 })
    epicollect_contract_last_sync_at?: Date;

  @Column('varchar', { nullable: true, unique: false })
    developer_group_telegram_chat_id?: string;

  /**
   * Relations
  **/

  @OneToMany(() => Grid, grid => grid.organization)
    grids?: Grid[];

  @OneToMany(() => Account, account => account.organization)
    accounts?: Account[];

  @OneToOne(() => Wallet, wallet => wallet.organization)
    wallet?: Wallet;

  @OneToMany(() => BankAccount, bank_account => bank_account.organization)
    bank_accounts?: BankAccount[];

  // @OneToMany(() => Audit, audit => audit.organization)
  //   audits?: Audit[];

  @OneToMany(() => Notification, notification => notification.organization)
    notifications?: Notification[];
}
