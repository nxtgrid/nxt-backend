import { TimeseriesEntity as TimeseriesEntity } from '@timeseries/types/timeseries-entity';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Index('order_snapshots_created_at_idx', [ 'created_at' ])
@Entity('order_snapshots')
export class OrderSnapshot extends TimeseriesEntity {

  @PrimaryColumn('int', { nullable: false })
    order_id: number;

  @Column('float8', { nullable: true })
    amount: number;

  @Column('varchar', { nullable: true })
    currency: string;

  @Column('int', { nullable: true })
    sender_wallet_id: number;

  @Column('int', { nullable: true })
    receiver_wallet_id: number;

  @Column('varchar', { nullable: true })
    sender_type: string;

  @Column('varchar', { nullable: true })
    receiver_type: string;

  @Column('varchar', { nullable: true })
    sender_name: string;

  @Column('varchar', { nullable: true })
    receiver_name: string;

  @Column('varchar', { nullable: true })
    status: string;

  @Column('varchar', { nullable: true })
    external_reference: string;

  @Column('int', { nullable: true })
    created_by_id: number;

  @Column('varchar', { nullable: true })
    created_by_name: string;

  @Column('varchar', { nullable: true })
    payment_method: string;

  @Column('varchar', { nullable: true })
    payment_channel: string;

  @Column('varchar', { nullable: true })
    tariff_type: string;

  @Column('float8', { nullable: true })
    tariff: number;

  @Column('varchar', { nullable: true })
    sender_subtype: string;

  @Column('varchar', { nullable: true })
    receiver_subtype: string;

  @Column('varchar', { nullable: true })
    grid_name: string;

  @Column('int', { nullable: true })
    grid_id: number;

  @Column('varchar', { nullable: true })
    organization_name: string;

  @Column('int', { nullable: true })
    organization_id: number;

  // TODO: deprecate
  // (if at least one is hidden of grids, customers, connections, meters it’s going to be marked as hidden)
  @Column('boolean', { nullable: true })
    sender_is_hidden_from_reporting?: boolean;

  // TODO: deprecate
  // (if at least one is hidden of grids, customers, connections, meters it’s going to be marked as hidden)
  @Column('boolean', { nullable: true })
    receiver_is_hidden_from_reporting?: boolean;

  @Column('boolean', { nullable: true })
    is_hidden_from_reporting: boolean;
}
