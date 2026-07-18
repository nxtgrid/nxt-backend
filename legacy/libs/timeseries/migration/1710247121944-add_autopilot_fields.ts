import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAutopilotFields1710247121944 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE autopilot_solutions_30_min ADD COLUMN initial_battery_kwh int;');
    await queryRunner.query('ALTER TABLE autopilot_solutions_30_min ADD COLUMN is_fs_on boolean;');
    await queryRunner.query('ALTER TABLE autopilot_solutions_30_min ADD COLUMN hps_consumption_kwh_sum_24_h float8;');
    await queryRunner.query('ALTER TABLE autopilot_solutions_30_min ADD COLUMN fs_consumption_kwh_sum_24_h float8;');
    await queryRunner.query('ALTER TABLE autopilot_solutions_30_min ADD COLUMN production_kwh_sum_24_h float8;');
    await queryRunner.query('ALTER TABLE autopilot_solutions_30_min ADD COLUMN hps_consumption_kwh_sum_3_h float8;');
    await queryRunner.query('ALTER TABLE autopilot_solutions_30_min ADD COLUMN fs_consumption_kwh_sum_3_h float8;');
    await queryRunner.query('ALTER TABLE autopilot_solutions_30_min ADD COLUMN production_kwh_sum_3_h float8;');
    await queryRunner.query('ALTER TABLE autopilot_solutions_30_min ADD COLUMN uptime_hps_hours float8;');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE autopilot_solutions_30_min DROP COLUMN uptime_hps_hours;');
    await queryRunner.query('ALTER TABLE autopilot_solutions_30_min DROP COLUMN production_kwh_sum_3_h;');
    await queryRunner.query('ALTER TABLE autopilot_solutions_30_min DROP COLUMN fs_consumption_kwh_sum_3_h;');
    await queryRunner.query('ALTER TABLE autopilot_solutions_30_min DROP COLUMN hps_consumption_kwh_sum_3_h;');
    await queryRunner.query('ALTER TABLE autopilot_solutions_30_min DROP COLUMN production_kwh_sum_24_h;');
    await queryRunner.query('ALTER TABLE autopilot_solutions_30_min DROP COLUMN fs_consumption_kwh_sum_24_h;');
    await queryRunner.query('ALTER TABLE autopilot_solutions_30_min DROP COLUMN hps_consumption_kwh_sum_24_h;');
    await queryRunner.query('ALTER TABLE autopilot_solutions_30_min DROP COLUMN is_fs_on;');
    await queryRunner.query('ALTER TABLE autopilot_solutions_30_min DROP COLUMN initial_battery_kwh;');
  }

}
