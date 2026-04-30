import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddingThreePhaseMeterCount1722840973959 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE grid_business_snapshot_1_d ADD COLUMN three_phase_meter_count int NULL;');
    await queryRunner.query('ALTER TABLE grid_business_snapshot_1_d ADD COLUMN single_phase_meter_count int NULL;');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE grid_business_snapshot_1_d DROP COLUMN single_phase_meter_count;');
    await queryRunner.query('ALTER TABLE grid_business_snapshot_1_d DROP COLUMN three_phase_meter_count;');
  }
}
