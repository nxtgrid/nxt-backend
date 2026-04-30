import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Index, OneToMany, OneToOne } from 'typeorm';

import { Meter } from '@core/modules/meters/entities/meter.entity';
import { DirectiveBatchExecution } from '../../directive-batch-executions/entities/directive-batch-execution.entity';
import { Order } from '@core/modules/orders/entities/order.entity';
import { Account } from '@core/modules/accounts/entities/account.entity';
import { MeterCommissioning } from '@core/modules/meter-commissionings/entities/meter-commissioning.entity';
// import { DirectiveWatchdogSession } from '@core/modules/directive-watchdog-sessions/entities/directive-watchdog-session.entity';
import { MeterCreditTransfer } from '@core/modules/meter-credit-transfers/entities/meter-credit-transfer.entity';

import { DirectiveErrorEnum, DirectiveSpecialStatusEnum, DirectiveStatusEnum, DirectiveTypeEnum } from '@core/types/supabase-types';

@Entity('directives')
@Index([ 'meter', 'directive_status', 'created_at' ])
@Index([ 'directive_status' ])
@Index([ 'token' ])
@Index([ 'execution_session' ])
export class Directive {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
    id?: number;

  @Column({ type: 'timestamptz', default: () => 'now()', precision: 3 })
    created_at?: Date;

  @Column({ type: 'timestamptz', precision: 3, nullable: true })
    updated_at?: Date;

  // METER_COMMISSIONING = 1200
  // TOPUP/USER COMMANDS = 1000
  // TOU_RULE = 800
  // WATCHDOG = 600
  // BATCH = 400
  // RANDOM_CHECK = 100
  @Column('int', { default: 0 })
    directive_priority?: number;

  // @Column('enum', { enum: DirectiveStatusEnum, default: 'PENDING' })
  @Column({ type: 'varchar' })
    directive_status?: DirectiveStatusEnum;

  // @Column('enum', { enum: DirectiveStatusEnum, nullable: true })
  @Column({ type: 'varchar' })
    directive_status_a?: DirectiveStatusEnum;

  // @Column('enum', { enum: DirectiveStatusEnum, nullable: true })
  @Column({ type: 'varchar' })
    directive_status_b?: DirectiveStatusEnum;

  // @Column('enum', { enum: DirectiveStatusEnum, nullable: true })
  @Column({ type: 'varchar' })
    directive_status_c?: DirectiveStatusEnum;

  // @Column('enum', { enum: DirectiveTypeEnum })
  @Column({ type: 'varchar' })
    directive_type?: DirectiveTypeEnum;

  @Column('varchar', { nullable: true })
    external_reference?: string;

  @Column('varchar', { nullable: true })
    external_reference_a?: string;

  @Column('varchar', { nullable: true })
    external_reference_b?: string;

  @Column('varchar', { nullable: true })
    external_reference_c?: string;

  @Column('int', { nullable: true })
    power_down_count?: number;

  @Column('int', { nullable: true })
    power_limit?: number;

  @Column('int', { nullable: true })
    power_limit_should_be?: number;

  @Column('bool', { nullable: true })
    is_on?: boolean;

  @Column('float', { nullable: true })
    kwh?: number;

  @Column('float', { nullable: true })
    kwh_credit_available?: number;

  @Column('float', { nullable: true })
    voltage?: number;

  @Column('float', { nullable: true })
    voltage_a?: number;

  @Column('float', { nullable: true })
    voltage_b?: number;

  @Column('float', { nullable: true })
    voltage_c?: number;

  @Column('float', { nullable: true })
    power?: number;

  @Column('float', { nullable: true })
    power_a?: number;

  @Column('float', { nullable: true })
    power_b?: number;

  @Column('float', { nullable: true })
    power_c?: number;

  // @Column('enum', { enum: DirectiveSpecialStatusEnum, nullable: true })
  @Column({ type: 'varchar' })
    directive_special_status?: DirectiveSpecialStatusEnum;

  // @Column('enum', { enum: DirectiveErrorEnum, nullable: true })
  @Column({ type: 'varchar' })
    directive_error?: DirectiveErrorEnum;

  @Column('varchar', { nullable: true })
    token?: string;

  @Column('varchar', { nullable: true })
    meter_version?: string;

  @Column('varchar', { nullable: true })
    execution_session?: string;

  @Column({ type: 'timestamptz', precision: 3, nullable: true })
    status_last_checked_at?: Date;

  @Column('varchar', { nullable: true })
    status_check_lock_session?: string;

  // This is to avoid the content of the directive_batch_deprecated column to be erased
  @Column('int', { nullable: true })
    directive_batch_deprecated_id?: number;

  @Column('boolean', { nullable: true })
    can_be_retried?: boolean;

  /**
   * Relations
  **/

  @Column('int', { nullable: true })
    meter_id?: number;

  @ManyToOne(() => Meter, meter => meter.directives)
  @JoinColumn({ name: 'meter_id' })
    meter?: Meter;

  @ManyToOne(() => Account, author => author.directives, { nullable: true })
  @JoinColumn({ name: 'author_id' })
    author?: Account;

  @ManyToOne(() => DirectiveBatchExecution, directiveBatchExecution => directiveBatchExecution.directives)
  @JoinColumn({ name: 'directive_batch_execution_id' })
    directive_batch_execution?: DirectiveBatchExecution;

  @Column('int', { nullable: true })
    directive_batch_execution_id?: number;

  @ManyToOne(() => Order, order => order.directives)
  @JoinColumn({ name: 'order_id' })
    order?: Order;

  @Column('int', { nullable: true })
    order_id?: number;

  @OneToOne(() => Order, order => order.directive)
    last_order_attempt?: Order;

  @Column('int', { nullable: true })
    meter_commissioning_id?: number;

  @ManyToOne(() => MeterCommissioning, meterCommissioning => meterCommissioning.directives)
  @JoinColumn({ name: 'meter_commissioning_id' })
    meter_commissioning?: MeterCommissioning;

  // @Column('int', { nullable: true })
  //   directive_watchdog_session_id?: number;

  // @ManyToOne(() => DirectiveWatchdogSession, directive_watchdog_session => directive_watchdog_session.directives)
  // @JoinColumn({ name: 'directive_watchdog_session_id' })
  //   directive_watchdog_session?: DirectiveWatchdogSession;

  @ManyToOne(() => MeterCreditTransfer, meter_credit_transfer => meter_credit_transfer.directives)
  @JoinColumn({ name: 'meter_credit_transfer_id' })
    meter_credit_transfer?: MeterCreditTransfer;

  @Column('int', { nullable: true })
    meter_credit_transfer_id?: number;

  // Retrying mechanism: a directive can point to another directive when it's retrying it.
  // A directive can be retried multiple times.
  @Column('int', { nullable: true })
    retry_of_directive_id?: number;

  @ManyToOne(() => Directive, directive => directive.directive_retries)
  @JoinColumn({ name: 'retry_of_directive_id' })
    retry_of_directive?: Directive;

  @OneToMany(() => Directive, directive => directive.retry_of_directive)
    directive_retries?: Directive[];
}
