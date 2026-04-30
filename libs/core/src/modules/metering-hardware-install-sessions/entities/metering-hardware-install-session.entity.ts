import { CoreEntity } from '@core/types/core-entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne } from 'typeorm';
import { Dcu } from '@core/modules/dcus/entities/dcu.entity';
import { Meter } from '@core/modules/meters/entities/meter.entity';
import { MeteringHardwareImport } from '@core/modules/metering-hardware-imports/entities/metering-hardware-import.entity';
import { MeterCommissioning } from '@core/modules/meter-commissionings/entities/meter-commissioning.entity';
import { Account } from '@core/modules/accounts/entities/account.entity';

@Entity('metering_hardware_install_sessions')
export class  MeteringHardwareInstallSession extends CoreEntity {
  @Column('int', { nullable: true })
    dcu_id: number;

  @ManyToOne(() => Dcu, dcu => dcu.dcu_install_sessions)
  @JoinColumn({ name: 'dcu_id' })
    dcu: Dcu;

  @Column('int', { nullable: true })
    meter_id: number;

  @ManyToOne(() => Meter, meter => meter.meter_install_sessions)
  @JoinColumn({ name: 'meter_id' })
    meter: Meter;

  @Column('int', { nullable: true })
    author_id: number;

  @ManyToOne(() => Account, account => account.metering_hardware_install_sessions)
  @JoinColumn({ name: 'author_id' })
    author: Account;

  // A session can have multiple attempts at meter imports. For now we are not
  // going to enforce the retries, but we are leaving the option open for the future
  @OneToMany(() => MeteringHardwareImport, metering_hardware_import => metering_hardware_import.metering_hardware_install_session)
    metering_hardware_imports: MeteringHardwareImport[];

  // A session can have multiple attempts at commissionings. For now we are not
  // going to enforce the retries, but we are leaving the option open for the future
  @OneToMany(() => MeterCommissioning, meter_commissioning => meter_commissioning.metering_hardware_install_session)
    meter_commissionings: MeterCommissioning[];

  @OneToOne(() => Dcu, dcu => dcu.last_metering_hardware_install_session)
    last_installed_dcu: Dcu;

  @OneToOne(() => Meter, meter => meter.last_metering_hardware_install_session)
    last_installed_meter: Meter;

  // This field is added to make it easier to access the latest data, otherwise
  // we are going to have to do a bunch of separate queries every time we want to
  // fetch hardware import and commissioning
  @OneToOne(() => MeterCommissioning, mc => mc.last_installed_commissioning_session)
  @JoinColumn({ name: 'last_meter_commissioning_id' })
    last_meter_commissioning: MeterCommissioning;

  @Column('int', { nullable: true })
    last_meter_commissioning_id: number;

  // This field is added to make it easier to access the latest data, otherwise
  // we are going to have to do a bunch of separate queries every time we want to
  // fetch hardware import and commissioning
  @OneToOne(() => MeteringHardwareImport, mc => mc.last_installed_metering_hardware_import_session)
  @JoinColumn({ name: 'last_metering_hardware_import_id' })
    last_metering_hardware_import: MeteringHardwareImport;

  @Column('int', { nullable: true })
    last_metering_hardware_import_id: number;
}
