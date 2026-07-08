import { Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { Organization } from '@core/modules/organizations/entities/organization.entity';
import { Bank } from '@core/modules/banks/entities/bank.entity';
import { CoreEntity } from '@core/types/core-entity';
import { Payout } from '@core/modules/payouts/entities/payout.entity';

@Entity('bank_accounts')
export class BankAccount extends CoreEntity {
  account_number: string;

  @ManyToOne(() => Organization, organization => organization.bank_accounts)
  @JoinColumn({ name: 'organization_id' })
    organization: Organization;

  @ManyToOne(() => Bank, bank => bank.bank_accounts)
  @JoinColumn({ name: 'bank_id' })
    bank: Bank;

  @OneToMany(() => Payout, payouts => payouts.bank_account)
    payouts: Payout[];
}
