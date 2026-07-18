import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

// There is a mistake here in the index naming, but eh, whatevs
@Index('mppt_forecast_snapshot_1_h_period_start_idx', [ 'period_start' ])
@Entity('mppt_forecast_snapshot_30_min')
export class MpptForecastSnapshot30Min {
  @Column({ type: 'timestamp', nullable: false })
    created_at: Date;

  @Column('timestamp', { nullable: false })
    updated_at: Date;

  @PrimaryColumn('timestamp', { nullable: false })
    period_start: Date;

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

  @Column('varchar', { nullable: true })
    mppt_type?: string;

  @Column('float8', { nullable: true })
    pv_estimate_kw?: number;
}
