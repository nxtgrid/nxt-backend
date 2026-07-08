import { TimeseriesEntity as TimeseriesEntity } from '@timeseries/types/timeseries-entity';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Index('router_snapshot_1_min_created_at_idx', [ 'created_at' ])
@Entity('router_snapshot_1_min')
export class RouterSnapshot1Min extends TimeseriesEntity {

  @Column('boolean', { nullable: true })
    is_online: boolean;

  @PrimaryColumn('int', { nullable: false })
    router_id: number;

  @Column('varchar', { nullable: true })
    router_external_reference: string;

  @Column('varchar', { nullable: true })
    router_external_system: string;

  @Column('int', { nullable: true })
    grid_id: number;

  @Column('varchar', { nullable: true })
    grid_name: string;

  @Column('int', { nullable: true })
    organization_id: number;

  @Column('varchar', { nullable: true })
    organization_name: string;
}
