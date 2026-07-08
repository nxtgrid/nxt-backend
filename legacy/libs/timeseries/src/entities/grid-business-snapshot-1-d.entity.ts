import { TimeseriesEntity as TimeseriesEntity } from '@timeseries/types/timeseries-entity';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Index('grid_business_snapshot_1_d_created_at_idx', [ 'created_at' ])
@Entity('grid_business_snapshot_1_d')
export class GridBusinessSnapshot1D extends TimeseriesEntity {
  @PrimaryColumn('int')
    grid_id: number;

  @Column('int', { nullable: true })
    organization_id?: number;

  @Column('varchar', { nullable: true })
    grid_name?: string;

  @Column('varchar', { nullable: true })
    organization_name?: string;

  @Column('float8', { nullable: true })
    energy_topup_revenue?: number;

  @Column('float8', { nullable: true })
    connection_fee_revenue?: number;

  @Column('float8', { nullable: true })
    kwp?: number;

  @Column('float8', { nullable: true })
    kwh?: number;

  @Column('float8', { nullable: true })
    monthly_rental?: number;

  @Column('int', { nullable: true })
    three_phase_meter_count?: number;

  @Column('int', { nullable: true })
    single_phase_meter_count?: number;

  @Column('int', { nullable: true })
    residential_connection_count?: number;

  @Column('int', { nullable: true })
    commercial_connection_count?: number;

  @Column('int', { nullable: true })
    public_connection_count?: number;

  @Column('int', { nullable: true })
    total_connection_count?: number;

  @Column('int', { nullable: true })
    women_impacted_count?: number;

  @Column('int', { nullable: true })
    fs_meter_count?: number;

  @Column('int', { nullable: true })
    hps_meter_count?: number;

  @Column('int', { nullable: true })
    total_meter_count?: number;

  @Column('int', { nullable: true })
    customer_count?: number;

  @Column('float4', { nullable: true })
    fs_tariff?: number;

  @Column('float4', { nullable: true })
    hps_tariff?: number;

  @Column('float8', { nullable: true })
    daily_rental?: number;

  @Column('int', { nullable: true })
    no_communication_issue_count?: number;

  @Column('int', { nullable: true })
    no_consumption_issue_count?: number;

  @Column('int', { nullable: true })
    no_credit_issue_count?: number;

  @Column('int', { nullable: true })
    not_activated_issue_count?: number;

  @Column('int', { nullable: true })
    tamper_issue_count?: number;

  @Column('int', { nullable: true })
    power_limit_breached_issue_count?: number;

  @Column('int', { nullable: true })
    over_voltage_issue_count?: number;

  @Column('int', { nullable: true })
    low_voltage_issue_count?: number;

  @Column('int', { nullable: true })
    unexpected_power_limit_issue_count?: number;

  @Column('int', { nullable: true })
    unexpected_meter_status_issue_count?: number;

  @Column('int', { nullable: true })
    total_issue_count?: number;

  @Column('float8', { nullable: true })
    cuf?: number;

  @Column('float8', { nullable: true })
    fs_consumption_kwh?: number;

  @Column('float8', { nullable: true })
    hps_consumption_kwh?: number;

  @Column('float8', { nullable: true })
    total_consumption_kwh?: number;

  @Column('float8', { nullable: true })
    total_estimated_mppt_production_kwh?: number;

  @Column('float8', { nullable: true })
    total_mppt_production_kwh?: number;

  @Column('int', { nullable: true })
    battery_modules_on_count?: number;

  @Column('int', { nullable: true })
    battery_modules_off_count?: number;

  @Column('float4', { nullable: true })
    fs_single_phase_connection_fee?: number;

  @Column('float4', { nullable: true })
    fs_three_phase_connection_fee?: number;

  @Column('float4', { nullable: true })
    hps_single_phase_connection_fee?: number;

  @Column('int', { nullable: true })
    lifeline_connection_count?: number;
}
