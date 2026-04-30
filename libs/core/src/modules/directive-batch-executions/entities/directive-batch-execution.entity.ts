import { Directive } from '@core/modules/directives/entities/directive.entity';
import { CoreEntity } from '@core/types/core-entity';
import { DirectiveBatch } from '@core/modules/directive-batches/entities/directive-batch.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

// @TODO :: Can delete when removed from directive entity
@Entity('directive_batch_executions')
export class DirectiveBatchExecution extends CoreEntity {

  @OneToMany(() => Directive, directive => directive.directive_batch_execution)
    directives: Directive[];

  @ManyToOne(() => DirectiveBatch, directive_batch => directive_batch.directive_batch_executions)
  @JoinColumn({ name: 'directive_batch_id' })
    directive_batch: DirectiveBatch;

  @Column('int', { default: 0 })
    pending_count: number;

  @Column('int', { default: 0 })
    processing_count: number;

  @Column('int', { default: 0 })
    successful_count: number;

  @Column('int', { default: 0 })
    failed_count: number;

  @Column('int', { default: 0 })
    processed_count: number;

  @Column('int', { default: 0 })
    total_count: number;
}
