import { TimeseriesEntity } from '@timeseries/types/timeseries-entity';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Index('meter_snapshot_1_h_created_at_idx', [ 'created_at' ])
@Entity('meter_snapshot_1_h')
export class MeterSnapshot1H extends TimeseriesEntity {
  @PrimaryColumn('int')
    meter_id: number;

  @Column('varchar', { nullable: true })
    meter_type?: string;

  @Column('varchar', { nullable: true })
    meter_external_reference?: string;

  @Column('varchar', { nullable: true })
    meter_external_system?: string;

  @Column('varchar', { nullable: true })
    customer_full_name?: string;

  @Column('int', { nullable: true })
    customer_id?: number;

  @Column('varchar', { nullable: true })
    dcu_external_reference?: string;

  @Column('varchar', { nullable: true })
    dcu_external_system?: string;

  @Column('int', { nullable: true })
    grid_id?: number;

  @Column('int', { nullable: true })
    dcu_id?: number;

  @Column('int', { nullable: true })
    organization_id?: number;

  @Column('varchar', { nullable: true })
    grid_name?: string;

  @Column('varchar', { nullable: true })
    organization_name?: string;

  @Column('float8', { nullable: true })
    consumption_kwh?: number;

  @Column('float4', { nullable: true })
    counter_kwh?: number;

  @Column('float4', { nullable: true })
    kwh_credit_available?: number;

  @Column('varchar', { nullable: true })
    meter_phase?: string;

  @Column('float8', { nullable: true })
    power_limit_kw?: number;

  @Column('float8', { nullable: true })
    power_limit_kw_should_be?: number;

  @Column('boolean', { nullable: true })
    is_hps_consumption?: boolean;

  @Column('boolean', { nullable: true })
    is_fs_consumption?: boolean;

  @Column('boolean', { nullable: true })
    is_on?: boolean;

  @Column('boolean', { nullable: true })
    should_be_on?: boolean;

  @Column('int', { nullable: true })
    connection_id?: number;

  @Column('bool', { default: false })
    is_hidden_from_reporting?: boolean;

  @Column('boolean', { default: false })
    is_cabin_meter?: boolean;
}
