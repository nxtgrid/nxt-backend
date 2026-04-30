import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Index('grid_forecast_snapshot_1_h_period_start_idx', [ 'period_start' ])
@Entity('grid_forecast_snapshot_1_h')
export class GridForecastSnapshot1H {

  @Column({ type: 'timestamp', nullable: false })
    created_at: Date;

  @PrimaryColumn('int')
    grid_id?: number;

  @Column('varchar', { nullable: true })
    grid_name?: string;

  @Column('int', { nullable: true })
    organization_id?: number;

  @Column('varchar', { nullable: true })
    organization_name?: string;

  @Column({ type: 'timestamp', nullable: false })
    updated_at: Date;

  @PrimaryColumn({ type: 'timestamp', nullable: false })
    period_start: Date;

  @Column('float8', { nullable: true })
    solar_yield_kwh?: number;

  @Column('float8', { nullable: true })
    consumption_kwh?: number;
}
