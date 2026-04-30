import { TimeseriesEntity } from '@timeseries/types/timeseries-entity';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Index('organization_snapshot_1_d_created_at_idx', [ 'created_at' ])
@Entity('organization_snapshot_1_d')
export class OrganizationSnapshot1D extends TimeseriesEntity {

  @PrimaryColumn('int', { nullable: false })
    organization_id: number;

  @Column('int', { nullable: true })
    grid_count: number;

  @Column('varchar', { nullable: true })
    organization_name: string;
}
