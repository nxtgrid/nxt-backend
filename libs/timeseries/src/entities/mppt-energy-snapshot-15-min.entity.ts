import { TimeseriesEntity } from '@timeseries/types/timeseries-entity';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Index('mppt_energy_snapshot_15_min_created_at_idx', [ 'created_at' ])
@Entity('mppt_energy_snapshot_15_min')
export class MpptEnergySnapshot15Min extends TimeseriesEntity {
  @PrimaryColumn('int', { nullable: false })
    mppt_id: number;

  @Column('varchar', { nullable: true })
    mppt_external_reference?: string;

  @Column('varchar', { nullable: true })
    mppt_external_system?: string;

  @Column('float8', { nullable: true })
    mppt_latitude?: number;

  @Column('float8', { nullable: true })
    mppt_longitude?: number;

  @Column('float8', { nullable: true })
    mppt_tilt?: number;

  @Column('varchar', { nullable: true })
    mppt_position_vertical?: string;

  @Column('varchar', { nullable: true })
    mppt_position_horizontal?: string;

  @Column('timestamp', { nullable: true })
    mppt_installed_at?: Date;

  @Column('float8', { nullable: true })
    mppt_azimuth?: number;

  @Column('float8', { nullable: true })
    mppt_kw?: number;

  @Column('int', { nullable: true })
    grid_id?: number;

  @Column('varchar', { nullable: true })
    grid_name?: string;

  @Column('int', { nullable: true })
    organization_id?: number;

  @Column('varchar', { nullable: true })
    organization_name?: string;

  @Column('float8', { nullable: true })
    kw?: number;

  @Column('varchar', { nullable: true })
    external_id?: string;

  @Column('varchar', { nullable: true })
    mppt_type?: string;
}
