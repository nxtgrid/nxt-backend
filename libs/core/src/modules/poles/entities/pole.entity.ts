import { Entity, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { CoreEntity } from '@core/types/core-entity';
import { Grid } from '@core/modules/grids/entities/grid.entity';
import { Meter } from '@core/modules/meters/entities/meter.entity';

@Entity('poles')
export class Pole extends CoreEntity {
  @Column('varchar', {
    unique: true,
    length: 10,
  })
    external_reference: string;

  @Column('varchar', { nullable: true })
    nickname: string;

  @Column('boolean', { default: false })
    is_virtual: boolean;

  @Column('float', { nullable: true })
    location_accuracy?: number;

  @Column('int', { nullable: true })
    grid_id: number;

  @ManyToOne(() => Grid, grid => grid.poles)
  @JoinColumn({ name: 'grid_id' })
    grid: Grid;

  @OneToMany(() => Meter, meter => meter.pole)
    meters: Meter[];
}
