import { Wallet } from '@core/modules/wallets/entities/wallet.entity';
import { OneToOne, JoinColumn, Entity, Column, ManyToOne/* , OneToMany */ } from 'typeorm';
import { CoreEntity } from '@core/types/core-entity';
import { Grid } from '@core/modules/grids/entities/grid.entity';
import { Account } from '@core/modules/accounts/entities/account.entity';
// import { Audit } from '@core/modules/audits/entities/audit.entity';

@Entity('agents')
export class Agent extends CoreEntity {
  @OneToOne(() => Wallet, wallet => wallet.agent)
    wallet?: Wallet;

  @Column('int', { nullable: true })
    grid_id?: number;

  @ManyToOne(() => Grid, grid => grid.agents)
  @JoinColumn({ name: 'grid_id' })
    grid?: Grid;

  // @OneToMany(() => Audit, audit => audit.agent)
  //   audits: Audit[];

  @OneToOne(() => Account)
  @JoinColumn({ name: 'account_id' })
    account: Account;
}
