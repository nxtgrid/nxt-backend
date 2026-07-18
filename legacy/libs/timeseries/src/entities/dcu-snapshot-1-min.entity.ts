import { TimeseriesEntity as TimeseriesEntity } from '@timeseries/types/timeseries-entity';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
@Index('dcu_snapshot_1_min_created_at_idx', [ 'created_at' ])
@Entity('dcu_snapshot_1_min')
export class DcuSnapshot1Min extends TimeseriesEntity {

  @Column('boolean', { nullable: true })
    is_online: boolean;

  @PrimaryColumn('int', { nullable: false })
    dcu_id: number;

  @Column('varchar', { nullable: true })
    dcu_external_reference: string;

  @Column('varchar', { nullable: true })
    dcu_external_system: string;

  @Column('int', { nullable: true })
    grid_id: number;

  @Column('varchar', { nullable: true })
    grid_name: string;

  @Column('int', { nullable: true })
    organization_id: number;

  @Column('varchar', { nullable: true })
    organization_name: string;
}
