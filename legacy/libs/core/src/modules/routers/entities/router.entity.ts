import { Column, DeleteDateColumn, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Grid } from '@core/modules/grids/entities/grid.entity';
import { CoreEntity } from '@core/types/core-entity';
import { ExternalSystemEnum } from '@core/types/supabase-types';

@Entity('routers')
export class Router extends CoreEntity {
  @Column('varchar')
    external_reference: string;

  // @Column('enum', { enum: ExternalSystemEnum, default: ExternalSystemEnum.ZEROTIER })
  @Column({ type: 'varchar' })
    external_system: ExternalSystemEnum;

  @Column('boolean', { default: false })
    is_online: boolean;

  @Column({ type: 'timestamptz', nullable: true, precision: 3 })
    is_online_updated_at: Date;

  @DeleteDateColumn({ type: 'timestamptz', precision: 3, nullable: true })
    deleted_at: Date;


  /**
   * Relations
  **/

  @Column('int', { nullable: true })
    grid_id: number;

  @ManyToOne(() => Grid, grid => grid.routers)
  @JoinColumn({ name: 'grid_id' })
    grid: Grid;
}
