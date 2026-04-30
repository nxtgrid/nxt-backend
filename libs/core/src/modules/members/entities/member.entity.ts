import { Entity, Column, OneToOne, JoinColumn, ManyToOne } from 'typeorm';
import { CoreEntity } from '@core/types/core-entity';
import { Account } from '@core/modules/accounts/entities/account.entity';
import { Grid } from '@core/modules/grids/entities/grid.entity';
import { MemberTypeEnum } from '@core/types/supabase-types';

@Entity('members')
export class Member extends CoreEntity {
  @Column('boolean', { default: false })
    subscribed_to_telegram_revenue_notifications?: boolean;

  @Column({ type: 'varchar' })
    member_type?: MemberTypeEnum;

  @OneToOne(() => Account)
  @JoinColumn({ name: 'account_id' })
    account?: Account;

  @ManyToOne(() => Grid, grid => grid.being_commissioned_by)
  @JoinColumn({ name: 'busy_commissioning_id' })
    busy_commissioning?: Grid;
}
