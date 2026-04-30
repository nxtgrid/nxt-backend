import { Entity, Column, OneToMany } from 'typeorm';
import { CoreEntity } from '@core/types/core-entity';
import { UssdSession } from '@core/modules/ussd-sessions/entities/ussd-session.entity';
import { BankAccount } from '@core/modules/bank-accounts/entities/bank-account.entity';

@Entity('banks')
export class Bank extends CoreEntity {
  @Column('varchar')
    name: string;

  @Column('varchar')
    external_id: string;

  @OneToMany(() => UssdSession, ussdSession => ussdSession.bank)
    ussd_sessions: UssdSession[];

  @OneToMany(() => BankAccount, bank_account => bank_account.bank)
    bank_accounts: BankAccount[];
}
