import { CoreEntity } from '@core/types/core-entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne } from 'typeorm';
import { Account } from '@core/modules/accounts/entities/account.entity';
import { Grid } from '@core/modules/grids/entities/grid.entity';
import { Connection } from '@core/modules/connections/entities/connection.entity';
import { Wallet } from '@core/modules/wallets/entities/wallet.entity';
// import { Audit } from '@core/modules/audits/entities/audit.entity';
import { Note } from '@core/modules/notes/entities/note.entity';
import { GenderEnum, GeneratorTypeEnum } from '@core/types/supabase-types';

@Entity('customers')
export class Customer extends CoreEntity {
  @OneToOne(() => Account)
  @JoinColumn({ name: 'account_id' })
    account?: Account;

  // @Column('enum', { enum: GenderEnum, nullable: true })
  @Column({ type: 'varchar' })
    gender?: GenderEnum;

  @Column('float', { default: 0 })
    total_connection_fee?: number;

  @Column('float', { default: 0 })
    total_connection_paid?: number;

  @Column('bool', { default: false })
    is_hidden_from_reporting?: boolean;

  @Column('bool', { default: true })
    lives_primarily_in_the_community?: boolean;

  @Column('float', { nullable: true })
    latitude?: number;

  @Column('float', { nullable: true })
    longitude?: number;

  // @Column('enum', { enum: GeneratorTypeEnum, nullable: true })
  @Column({ type: 'varchar' })
    generator_owned?: GeneratorTypeEnum;

  @OneToMany(() => Connection, connection => connection.customer)
    connections?: Connection[];

  @Column('int', { nullable: true })
    grid_id?: number;

  // @TODO :: DB Migration to make grid NOT nullable
  @ManyToOne(() => Grid, grid => grid.customers)
  @JoinColumn({ name: 'grid_id' })
    grid?: Grid;

  @OneToOne(() => Wallet, wallet => wallet.customer)
    wallet?: Wallet;

  // @OneToMany(() => Audit, audit => audit.customer)
  //   audits?: Audit[];

  @OneToMany(() => Note, note => note.customer)
    notes?: Note[];
}
