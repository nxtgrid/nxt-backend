import { TimeseriesEntity } from '@timeseries/types/timeseries-entity';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Index('grid_energy_snapshot_15_min_created_at_idx', [ 'created_at' ])
@Entity('grid_energy_snapshot_15_min')
export class GridEnergySnapshot15Min extends TimeseriesEntity {
  @Column('float8', { nullable: true })
    grid_consumption_total_kwh?: number;

  @Column('float8', { nullable: true })
    grid_l1_power_consumption_total_a1_w?: number;

  @Column('float8', { nullable: true })
    grid_l2_power_consumption_total_a2_w?: number;

  @Column('float8', { nullable: true })
    grid_l3_power_consumption_total_a3_w?: number;

  @Column('boolean', { nullable: true })
    is_fs_active?: boolean;

  @Column('boolean', { nullable: true })
    should_fs_be_on?: boolean;

  @Column('boolean', { nullable: true })
    is_hps_on?: boolean;

  @Column('float8', { nullable: true })
    battery_soc_bs_pct?: number;

  @Column('float8', { nullable: true })
    battery_voltage_bv_v?: number;

  @Column('float8', { nullable: true })
    battery_current_bc_a?: number;

  @Column('float8', { nullable: true })
    battery_charging_state_bst_enum?: number;

  @Column('float8', { nullable: true })
    battery_charge_current_limit_mcc_a?: number;

  @Column('float8', { nullable: true })
    pv_power_dc_pdc_w?: number;

  @Column('float8', { nullable: true })
    pv_energy_to_battery_pb_kwh?: number;

  @Column('float8', { nullable: true })
    pv_energy_to_grid_pc_kwh?: number;

  @PrimaryColumn('int')
    grid_id?: number;

  @Column('varchar', { nullable: true })
    grid_name?: string;

  @Column('int', { nullable: true })
    organization_id?: number;

  @Column('varchar', { nullable: true })
    organization_name?: string;

  @Column('float8', { nullable: true })
    grid_l1_power_consumption_output_o1_w?: number;

  @Column('float8', { nullable: true })
    grid_l2_power_consumption_output_o2_w?: number;

  @Column('float8', { nullable: true })
    grid_l3_power_consumption_output_o3_w?: number;

  @Column('float8', { nullable: true })
    battery_current_i_a?: number;

  @Column('boolean', { nullable: true })
    is_curtailing?: boolean;

  @Column('float8', { nullable: true })
    battery_min_cell_temp_mct_c?: number;

  @Column('float8', { nullable: true })
    battery_temperature_bt_c?: number;

  @Column('float8', { nullable: true })
    battery_capacity_ca_ah?: number;
}
