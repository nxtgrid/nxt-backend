import { CoreEntity } from '@core/types/core-entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { Grid } from '@core/modules/grids/entities/grid.entity';
import { DirectiveBatchExecution } from '@core/modules/directive-batch-executions/entities/directive-batch-execution.entity';
import { Account } from '@core/modules/accounts/entities/account.entity';
import { DirectiveTypeEnum, FCommandTypeEnum } from '@core/types/supabase-types';

@Entity('directive_batches')
export class DirectiveBatch extends CoreEntity {
  @Column('bool', { default: false })
    is_deleted: boolean;

  @Column('int')
    hour: number;

  @Column('int')
    minute: number;

  @Column('bool', { default: false })
    is_repeating: boolean;

  @Column('int', { nullable: true })
    grid_id: number;

  @ManyToOne(() => Grid, grid => grid.directive_batches)
  @JoinColumn({ name: 'grid_id' })
    grid: Grid;

  // @Column('enum', { enum: DirectiveTypeEnum, nullable: true })
  @Column({ type: 'varchar' })
    directive_type: DirectiveTypeEnum;

  // @Column('enum', { enum: FCommandTypeEnum, nullable: true })
  @Column({ type: 'varchar' })
    fs_command: FCommandTypeEnum;

  @OneToMany(() => DirectiveBatchExecution, directive_batch_execution => directive_batch_execution.directive_batch)
    directive_batch_executions: DirectiveBatchExecution[];

  @Column('varchar', { nullable: true })
    lock_session: string;

  @Column('int', { nullable: true })
    execution_bucket: number;

  @Column('int', { nullable: true })
    author_id: number;

  //todo: should this be pointing at a member?
  @ManyToOne(() => Account, author => author.tou_rules)
  @JoinColumn({ name: 'author_id' })
    author: Account;

  @Column({ type: 'timestamptz', precision: 3, nullable: true })
    updated_at: Date;
}
