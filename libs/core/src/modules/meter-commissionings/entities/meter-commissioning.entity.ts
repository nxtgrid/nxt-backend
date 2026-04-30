import { CoreEntity } from '@core/types/core-entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne } from 'typeorm';
import { Directive } from '@core/modules/directives/entities/directive.entity';
import { MeteringHardwareInstallSession } from '@core/modules/metering-hardware-install-sessions/entities/metering-hardware-install-session.entity';
import { MeterCommissioningStatusEnum } from '@core/types/supabase-types';

@Entity('meter_commissionings')
export class MeterCommissioning extends CoreEntity {
  @OneToMany(() => Directive, directive => directive.meter_commissioning)
    directives: Directive[];

  // @Column('enum', { enum: MeterCommissioningStatusEnum, default: MeterCommissioningStatusEnum.PROCESSING })
  @Column({ type: 'varchar' })
    meter_commissioning_status: MeterCommissioningStatusEnum;

  @Column('int', { nullable: true })
    initialised_steps: number;

  @Column('int', { nullable: true })
    pending_steps: number;

  @Column('int', { nullable: true })
    processing_steps: number;

  @Column('int', { nullable: true })
    successful_steps: number;

  @Column('int', { nullable: true })
    failed_steps: number;

  @Column('int', { nullable: true })
    total_steps: number;

  @Column('varchar', { nullable: true })
    lock_session: string;

  @Column('int', { nullable: true })
    metering_hardware_install_session_id: number;

  @ManyToOne(() => MeteringHardwareInstallSession, installSession => installSession.meter_commissionings)
  @JoinColumn({ name: 'metering_hardware_install_session_id' })
    metering_hardware_install_session: MeteringHardwareInstallSession;

  @OneToOne(() => MeteringHardwareInstallSession, meteringHardwareInstallSession => meteringHardwareInstallSession.last_meter_commissioning)
    last_installed_commissioning_session: MeteringHardwareInstallSession;
}
