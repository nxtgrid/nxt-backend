import { Entity, Column, OneToMany, JoinColumn, ManyToOne, Index, OneToOne } from 'typeorm';
import { CoreEntity } from '@core/types/core-entity';
import { Meter } from '@core/modules/meters/entities/meter.entity';
import { Grid } from '@core/modules/grids/entities/grid.entity';
import { MeteringHardwareInstallSession } from '@core/modules/metering-hardware-install-sessions/entities/metering-hardware-install-session.entity';
// import { Audit } from '@core/modules/audits/entities/audit.entity';
import { CommunicationProtocolEnum, ExternalSystemEnum } from '@core/types/supabase-types';

@Entity('dcus')
@Index([ 'external_reference', 'external_system' ], { unique: true }) // There cannot be more than one external reference from the same provider
export class Dcu extends CoreEntity {
  @Column('varchar')
    external_reference?: string;

  @Column('int', { default: 50 })
    queue_buffer_length?: number;

  // @Column('enum', { enum: ExternalSystemEnum })
  @Column({ type: 'varchar' })
    external_system?: ExternalSystemEnum;

  @Column('bool', { default: false })
    is_online?: boolean;

  @Column({ type: 'timestamptz', precision: 3, nullable: true })
    last_online_at?: Date;

  @Column({ type: 'timestamptz', precision: 3, nullable: true })
    is_online_updated_at?: Date;

  @OneToMany(() => MeteringHardwareInstallSession, dcu_install_session => dcu_install_session.dcu)
    dcu_install_sessions?: MeteringHardwareInstallSession[];

  // @Column('enum', { enum: CommunicationProtocolEnum, nullable: true })
  @Column({ type: 'varchar' })
    communication_protocol?: CommunicationProtocolEnum;

  /**
   * Relations
  **/

  @Column('int', { nullable: true })
    grid_id?: number;

  @ManyToOne(() => Grid, grid => grid.dcus)
  @JoinColumn({ name: 'grid_id' })
    grid?: Grid;

  @OneToMany(() => Meter, meter => meter.dcu)
    meters?: Meter[];

  @Column('int', { nullable: true })
    last_metering_hardware_install_session_id?: number;

  // @OneToMany(() => Audit, audit => audit.dcu)
  //   audits?: Audit[];

  @OneToOne(() => MeteringHardwareInstallSession, dcuInstallSession => dcuInstallSession.last_installed_dcu)
  @JoinColumn({ name: 'last_metering_hardware_install_session_id' })
    last_metering_hardware_install_session?: MeteringHardwareInstallSession;

  @Column('int', { nullable: true })
    rls_organization_id: number;

  /**
   * Post processed fields
  **/

  meter_count?: number;
}
