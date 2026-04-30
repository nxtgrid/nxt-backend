import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameColumnsGridEnergySnapshot15Min1701206158625 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min RENAME COLUMN total_consumption_kwh TO grid_consumption_total_kwh;');
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min RENAME COLUMN a1 TO grid_l1_power_consumption_total_a1_w;');
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min RENAME COLUMN a2 TO grid_l2_power_consumption_total_a2_w;');
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min RENAME COLUMN a3 TO grid_l3_power_consumption_total_a3_w;');
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min RENAME COLUMN bs TO battery_soc_bs_pct;');
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min RENAME COLUMN bv TO battery_voltage_bv_v;');
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min RENAME COLUMN bc TO battery_current_bc_a;');
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min RENAME COLUMN bst TO battery_charging_state_bst_enum;');
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min RENAME COLUMN mcc TO battery_charge_current_limit_mcc_a;');
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min RENAME COLUMN pdc TO pv_power_dc_pdc_w;');
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min RENAME COLUMN pb TO pv_energy_to_grid_pb_kwh;');
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min RENAME COLUMN pc TO pv_energy_to_grid_pc_kwh;');
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min RENAME COLUMN o1 TO grid_l1_power_consumption_output_o1_w;');
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min RENAME COLUMN o2 TO grid_l2_power_consumption_output_o2_w;');
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min RENAME COLUMN o3 TO grid_l3_power_consumption_output_o3_w;');
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min RENAME COLUMN i TO battery_current_i_a;');
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min RENAME COLUMN mct TO battery_min_cell_temp_mct_c;');
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min RENAME COLUMN bt TO battery_temperature_bt_c;');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min RENAME COLUMN battery_temperature_bt_c TO bt;');
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min RENAME COLUMN battery_min_cell_temp_mct_c TO mct;');
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min RENAME COLUMN battery_current_i_a TO i;');
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min RENAME COLUMN grid_l3_power_consumption_output_o3_w TO o3;');
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min RENAME COLUMN grid_l2_power_consumption_output_o2_w TO o2;');
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min RENAME COLUMN grid_l1_power_consumption_output_o1_w TO o1;');
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min RENAME COLUMN pv_energy_to_grid_pc_kwh TO pc;');
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min RENAME COLUMN pv_energy_to_grid_pb_kwh TO pb;');
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min RENAME COLUMN pv_power_dc_pdc_w TO pdc;');
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min RENAME COLUMN battery_charge_current_limit_mcc_a TO mcc;');
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min RENAME COLUMN battery_charging_state_bst_enum TO bst;');
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min RENAME COLUMN battery_current_bc_a TO bc;');
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min RENAME COLUMN battery_voltage_bv_v TO bv;');
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min RENAME COLUMN battery_soc_bs_pct TO bs;');
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min RENAME COLUMN grid_l1_power_consumption_total_a3_W TO a3;');
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min RENAME COLUMN grid_l2_power_consumption_total_a2_W TO a2;');
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min RENAME COLUMN grid_l1_power_consumption_total_a1_W TO a1;');
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min RENAME COLUMN grid_consumption_total_kwh TO total_consumption_kwh;');
  }
}
