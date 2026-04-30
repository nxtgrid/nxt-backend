import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { Grid } from '@core/modules/grids/entities/grid.entity';
import { CoreEntity } from '@core/types/core-entity';
import { Issue } from '@core/modules/issues/entities/issue.entity';
import { ExternalSystemEnum, MpptTypeEnum } from '@core/types/supabase-types';

@Entity('mppts')
export class Mppt extends CoreEntity {
  // this corresponds to the VRM name
  @Column('varchar')
    external_reference: string;

  // this corresponds to the VRM instance id
  @Column('varchar')
    external_id: string;

  // @Column('enum', { enum: ExternalSystemEnum, default: ExternalSystemEnum.VICTRON })
  @Column({ type: 'varchar' })
    external_system: ExternalSystemEnum;

  @Column('float', { nullable: true })
    kw: number;

  @Column('float', { nullable: true })
    azimuth: number;

  @Column('float', { nullable: true })
    tilt: number;

  // @Column('varchar')
  //   position_horizontal: string;

  // @Column('varchar')
  //   position_vertical: string;

  @Column({ type: 'timestamptz', default: () => 'now()', precision: 3 })
    installed_at: Date;

  // @Column('bool', { default: false })
  //   is_deleted: boolean;

  @Column({ type: 'timestamptz', default: null, precision: 3 })
    deleted_at: Date;

  // @Column('enum', { enum: MpptTypeEnum, default: MpptTypeEnum.MPPT })
  @Column({ type: 'varchar' })
    mppt_type?: MpptTypeEnum;

  /**
   * Relations
  **/

  @Column('int', { nullable: true })
    grid_id: number;

  @ManyToOne(() => Grid, grid => grid.dcus)
  @JoinColumn({ name: 'grid_id' })
    grid: Grid;

  @OneToMany(() => Issue, issue => issue.mppt)
    issues: Issue[];

  @Column('int', { nullable: true })
    rls_organization_id: number;
}
