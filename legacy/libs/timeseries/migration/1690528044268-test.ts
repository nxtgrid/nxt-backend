import { MigrationInterface, QueryRunner } from 'typeorm';

export class Test1690528044268 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min ADD COLUMN o1 float8 NULL;');
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min ADD COLUMN o2 float8 NULL;');
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min ADD COLUMN o3 float8 NULL;');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min drop COLUMN o1;');
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min drop COLUMN o2;');
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min drop COLUMN o3;');
  }
}
