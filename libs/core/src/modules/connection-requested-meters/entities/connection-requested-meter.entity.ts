// import { Entity, Column, ManyToOne, JoinColumn, DeleteDateColumn } from 'typeorm';
// import { CoreEntity } from '@core/types/core-entity';
// import { Connection } from '@core/modules/connections/entities/connection.entity';
// import { MeterPhaseEnum, MeterTypeEnum } from '@core/types/supabase-types';

// @Entity('connection_requested_meters')
// export class ConnectionRequestedMeter extends CoreEntity {
//   // @Column('enum', { enum: MeterTypeEnum })
//   @Column({ type: 'varchar' })
//     meter_type: MeterTypeEnum;

//   // @Column('enum', { enum: MeterPhaseEnum })
//   @Column({ type: 'varchar' })
//     meter_phase: MeterPhaseEnum;

//   @Column('float', { default: 0 })
//     fee: number;

//   @DeleteDateColumn({ precision: 3 })
//     deleted_at: Date;

//   @Column('int')
//     connection_id: number;

//   @ManyToOne(() => Connection, connection => connection.connection_requested_meters)
//   @JoinColumn({ name: 'connection_id' })
//     connection: Connection;
// }
