import { CoreEntity } from '@core/types/core-entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Account } from '@core/modules/accounts/entities/account.entity';

@Entity('api_keys')
export class ApiKey extends CoreEntity {
  @ManyToOne(() => Account, author => author.api_keys)
  @JoinColumn({ name: 'account_id' })
    account: Account;

  @Column('bool', { default: false })
    is_locked: boolean;

  @Column('varchar', { nullable: true, unique: true })
    key: string;
}
