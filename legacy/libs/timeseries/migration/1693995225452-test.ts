import { MigrationInterface, QueryRunner } from 'typeorm';

export class Test1693995225452 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min ADD COLUMN mct float8 NULL;');
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min ADD COLUMN bt float8 NULL;');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min drop COLUMN mct;');
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min drop COLUMN bt;');
  }
}
