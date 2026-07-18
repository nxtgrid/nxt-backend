import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeBatteryState1710248567378 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE autopilot_solutions_30_min ALTER COLUMN initial_battery_kwh TYPE float8;');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE autopilot_solutions_30_min ALTER COLUMN initial_battery_kwh TYPE int;');
  }

}


