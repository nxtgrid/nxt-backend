import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { CurrencyEnum } from '@core/types/supabase-types';

@Index('exchange_rate_snapshot_1_d_period_start_idx', [ 'period_start' ])
@Entity('exchange_rate_snapshot_1_d')
export class ExchangeRateSnapshot1D {

  @Column({ type: 'timestamp', nullable: false })
    created_at: Date;

  @PrimaryColumn({ type: 'timestamp', nullable: false })
    period_start: Date;

  @PrimaryColumn('varchar', { nullable: false })
    from_currency: CurrencyEnum;

  @PrimaryColumn('varchar', { nullable: false })
    to_currency: CurrencyEnum;

  @Column('float8', { nullable: true })
    value: number;
}
