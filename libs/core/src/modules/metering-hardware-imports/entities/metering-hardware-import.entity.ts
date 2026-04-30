import { Column, JoinColumn, Entity, ManyToOne, OneToOne } from 'typeorm';
import { CoreEntity } from '@core/types/core-entity';
import { MeteringHardwareInstallSession } from '@core/modules/metering-hardware-install-sessions/entities/metering-hardware-install-session.entity';
import { MhiOperationEnum, MhiStatusEnum } from '@core/types/supabase-types';

@Entity('metering_hardware_imports')
export class MeteringHardwareImport extends CoreEntity {
  // @Column('enum', { enum: MhiOperationEnum, default: MhiOperationEnum.ADD, enumName: 'mhi_operation' })
  @Column({ type: 'varchar' })
    metering_hardware_import_operation: MhiOperationEnum;

  // @Column('enum', { enum: MhiStatusEnum, default: MhiStatusEnum.PENDING, enumName: 'mhi_status' })
  @Column({ type: 'varchar' })
    metering_hardware_import_status: MhiStatusEnum;

  @ManyToOne(() => MeteringHardwareInstallSession, installSession => installSession.metering_hardware_imports)
  @JoinColumn({ name: 'metering_hardware_install_session_id' })
    metering_hardware_install_session: MeteringHardwareInstallSession;

  @Column('int', { nullable: true })
    metering_hardware_install_session_id: number;

  @Column('varchar', { nullable: true })
    lock_session: string;

  @OneToOne(() => MeteringHardwareInstallSession, meteringHardwareInstallSession => meteringHardwareInstallSession.last_metering_hardware_import)
    last_installed_metering_hardware_import_session: MeteringHardwareInstallSession;
}
