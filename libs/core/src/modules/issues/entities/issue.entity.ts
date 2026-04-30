import { Meter } from '@core/modules/meters/entities/meter.entity';
import { CoreEntity } from '@core/types/core-entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { Mppt } from '@core/modules/mppts/entities/mppt.entity';
import { Grid } from '@core/modules/grids/entities/grid.entity';
import { ExternalSystemEnum, IssueStatusEnum, IssueTypeEnum } from '@core/types/supabase-types';

@Entity('issues')
export class Issue extends CoreEntity {
  // @Column('enum', { enum: IssueTypeEnum })
  @Column({ type: 'varchar' })
    issue_type: IssueTypeEnum;

  // @Column('enum', { enum: IssueStatusEnum, default: IssueStatusEnum.OPEN })
  @Column({ type: 'varchar' })
    issue_status: IssueStatusEnum;

  // @Column('enum', { enum: ExternalSystemEnum, default: ExternalSystemEnum.JIRA })
  @Column({ type: 'varchar' })
    external_system: ExternalSystemEnum;

  @ManyToOne(() => Meter, meter => meter.issues)
  @JoinColumn({ name: 'meter_id' })
    meter: Meter;

  @OneToOne(() => Meter, meter => meter.last_encountered_issue)
    last_encountered_issue_meter: Meter;

  @ManyToOne(() => Mppt, mppt => mppt.issues)
  @JoinColumn({ name: 'mppt_id' })
    mppt: Mppt;

  @ManyToOne(() => Grid, grid => grid.issues)
  @JoinColumn({ name: 'grid_id' })
    grid: Grid;

  @Column('timestamptz', { nullable: true })
    snoozed_until: Date;

  @Column({ type: 'timestamptz', nullable: true, precision: 3 })
    started_at: Date;

  @Column({ type: 'timestamptz', nullable: true, precision: 3 })
    closed_at: Date;

  @Column('float', { default: 0 })
    estimated_lost_revenue: number;

  @Column('varchar', { nullable: true })
    external_reference: string;
}
