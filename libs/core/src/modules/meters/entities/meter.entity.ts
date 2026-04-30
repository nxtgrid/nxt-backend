import { Entity, Column, JoinColumn, ManyToOne, OneToMany, Index, OneToOne, DeleteDateColumn } from 'typeorm';
import { CoreEntity } from '@core/types/core-entity';
import { Dcu } from '@core/modules/dcus/entities/dcu.entity';
import { Pole } from '@core/modules/poles/entities/pole.entity';
import { Directive } from '@core/modules/directives/entities/directive.entity';
import { UssdSession } from '@core/modules/ussd-sessions/entities/ussd-session.entity';
import { Connection } from '@core/modules/connections/entities/connection.entity';
import { Wallet } from '@core/modules/wallets/entities/wallet.entity';
import { Issue } from '@core/modules/issues/entities/issue.entity';
// import { Audit } from '@core/modules/audits/entities/audit.entity';
import { MeteringHardwareInstallSession } from '@core/modules/metering-hardware-install-sessions/entities/metering-hardware-install-session.entity';
import { Note } from '@core/modules/notes/entities/note.entity';
import { MeterCreditTransfer } from '@core/modules/meter-credit-transfers/entities/meter-credit-transfer.entity';

import { CommunicationProtocolEnum, DirectiveSpecialStatusEnum, ExternalSystemEnum, MeterPhaseEnum, MeterTypeEnum } from '@core/types/supabase-types';

@Entity('meters')
@Index([ 'external_reference', 'external_system' ], { unique: true }) //there cannot be more than one external reference from the same provider
@Index([ 'dcu', 'connection' ])
export class Meter extends CoreEntity {
  @Column('varchar')
    external_reference: string;

  @DeleteDateColumn({ type: 'timestamp', precision: 3, nullable: true })
    deleted_at?: Date;

  @Column('float', { nullable: true })
    balance?: number;

  @Column({ type: 'timestamptz', precision: 3, nullable: true })
    balance_updated_at?: Date;

  @Column('float', { nullable: true })
    kwh_credit_available?: number;

  @Column({ type: 'timestamptz', precision: 3, nullable: true })
    kwh_credit_available_updated_at?: Date;

  @Column({ type: 'timestamptz', precision: 3, nullable: true })
    last_non_zero_consumption_at?: Date;

  @Column('bool', { default: false, nullable: true })
    is_on?: boolean;

  @Column('bool', { default: false, nullable: true })
    should_be_on?: boolean;

  @Column({ type: 'timestamptz', precision: 3, nullable: true })
    is_on_updated_at?: Date;

  @Column({ type: 'timestamptz', precision: 3, nullable: true })
    should_be_on_updated_at?: Date;

  @Column('bool', { default: false })
    is_test_mode_on?: boolean;

  @Column('bool', { default: false })
    is_manual_mode_on?: boolean;

  @Column({ type: 'timestamptz', precision: 3, nullable: true })
    is_manual_mode_on_updated_at?: Date;

  @Column('float', { nullable: true })
    voltage?: number;

  @Column({ type: 'timestamptz', precision: 3, nullable: true })
    voltage_updated_at?: Date;

  @Column('float', { nullable: true })
    power?: number;

  @Column({ type: 'timestamptz', precision: 3, nullable: true })
    power_updated_at?: Date;

  @Column('float', { nullable: true })
    latitude?: number;

  @Column('float', { nullable: true })
    longitude?: number;

  @Column('float', { default: 0 })
    coord_accuracy?: number;

  @Column('int', { default: null, nullable: true })
    power_limit?: number;

  @Column({ type: 'timestamptz', precision: 3, nullable: true })
    power_limit_updated_at?: Date;

  @Column('int', { default: null, nullable: true })
    power_limit_should_be?: number;

  @Column('int', { default: null, nullable: true })
    power_down_count?: number;

  @Column({ type: 'timestamp', nullable: true, precision: 3 })
    power_down_count_updated_at?: Date;

  @Column({ type: 'timestamptz', precision: 3, nullable: true })
    power_limit_should_be_updated_at?: Date;

  @Column('bool', { default: false })
    is_starred?: boolean;

  @OneToMany(() => Directive, directive => directive.meter)
    directives?: Directive[];

  @OneToMany(() => MeteringHardwareInstallSession, install_session => install_session.meter)
    meter_install_sessions?: MeteringHardwareInstallSession[];

  @OneToMany(() => MeterCreditTransfer, meter_credit_transfer => meter_credit_transfer.sender_meter)
    sender_meter_credit_transfers?: MeterCreditTransfer[];

  @OneToMany(() => MeterCreditTransfer, meter_credit_transfer => meter_credit_transfer.receiver_meter)
    receiver_meter_credit_transfers?: MeterCreditTransfer[];

  @OneToMany(() => Issue, issue => issue.meter)
    issues?: Issue[];

  @OneToOne(() => Issue, issue => issue.last_encountered_issue_meter)
  @JoinColumn({ name: 'last_encountered_issue_id' })
    last_encountered_issue?: Issue;

  @ManyToOne(() => Connection, connection => connection.meters)
  @JoinColumn({ name: 'connection_id' })
    connection?: Connection;

  // @Column('enum', { enum: ExternalSystemEnum })
  @Column({ type: 'varchar' })
    external_system?: ExternalSystemEnum;

  @ManyToOne(() => Dcu, dcu => dcu.meters)
  @JoinColumn({ name: 'dcu_id' })
    dcu?: Dcu;

  @OneToMany(() => UssdSession, ussdSession => ussdSession.meter)
    ussd_sessions?: UssdSession[];

  // @Column('enum', { enum: MeterTypeEnum, default: MeterTypeEnum.HPS })
  @Column({ type: 'varchar' })
    meter_type?: MeterTypeEnum;

  @OneToOne(() => Wallet, wallet => wallet.meter)
    wallet?: Wallet;

  @Column('varchar', { nullable: true })
    nickname?: string;

  @Column({ type: 'timestamptz', precision: 3, nullable: true })
    last_seen_at?: Date;

  @Column('varchar', { nullable: true })
    issue_check_execution_session?: string;

  @Column({ type: 'timestamptz', precision: 3, nullable: true })
    issue_check_last_run_at?: Date;

  // @OneToMany(() => Audit, audit => audit.meter)
  //   audits?: Audit[];

  @Column('int', { nullable: true })
    pole_id?: number;

  @ManyToOne(() => Pole, pole => pole.meters)
  @JoinColumn({ name: 'pole_id' })
    pole?: Pole;

  // @Column('enum', { enum: MeterPhaseEnum, default: MeterPhaseEnum.SINGLE_PHASE })
  @Column({ type: 'varchar' })
    meter_phase: MeterPhaseEnum;

  // a meter can have multiple install sessions
  @OneToMany(() => MeteringHardwareInstallSession, mhis => mhis.meter)
    metering_hardware_install_sessions?: MeteringHardwareInstallSession[];

  // this is the last session in wich the meter was involved
  @OneToOne(() => MeteringHardwareInstallSession, mhis => mhis.last_installed_meter)
  @JoinColumn({ name: 'last_metering_hardware_install_session_id' })
    last_metering_hardware_install_session?: MeteringHardwareInstallSession;

  @Column('int', { nullable: true })
    last_metering_hardware_install_session_id?: number;

  // these are the field that allow for the definition of meter level tariff.
  // they are used in the conversion from NGN to kwh during topup, and
  // in the read current credit logic, where we need to translate from kwh to ngn
  @Column('float', { nullable: true })
    kwh_tariff?: number;

  // @Column('varchar', { nullable: true })
  //   watchdog_session?: string;

  // @Column({ type: 'timestamptz', precision: 3, nullable: true })
  //   watchdog_last_run_at?: Date;

  // this is necessary to keep track of what kind of meter it is, since old
  // calin meters do not support the PLS command
  @Column('varchar', { nullable: true })
    version?: string;

  @OneToMany(() => Note, note => note.meter)
    notes?: Note[];

  @Column('bool', { default: false })
    is_simulated: boolean;

  @Column('int', { default: 200 })
    power_limit_hps_mode?: number;

  // @Column('enum', { enum: DirectiveSpecialStatusEnum, nullable: true })
  @Column({ type: 'varchar' })
    current_special_status?: DirectiveSpecialStatusEnum;

  // @Column('enum', { enum: CommunicationProtocolEnum, nullable: true })
  @Column({ type: 'varchar' })
    communication_protocol: CommunicationProtocolEnum;

  @Column('boolean', { default: false })
    is_cabin_meter?: boolean;

  @Column('varchar', { nullable: true })
    decoder_key?: string;

  @Column({ type: 'timestamptz', precision: 3, nullable: true })
    last_sts_token_issued_at?: Date;

  @Column('int', { default: false, nullable: true })
    rls_grid_id?: number;

  @Column('int', { default: false, nullable: true })
    rls_organization_id?: number;
}
