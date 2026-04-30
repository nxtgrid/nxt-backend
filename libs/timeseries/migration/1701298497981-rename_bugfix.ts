import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameBugfix1701298497981 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min RENAME COLUMN pv_energy_to_grid_pb_kwh TO pv_energy_to_battery_pb_kwh;');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min RENAME COLUMN pv_energy_to_battery_pb_kwh TO pv_energy_to_grid_pb_kwh;');
  }
}

