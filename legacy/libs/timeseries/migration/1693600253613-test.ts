import { MigrationInterface, QueryRunner } from 'typeorm';

export class Test1693600253613 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min drop COLUMN bcn;');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min ADD COLUMN bcn float8 NULL;');
  }
}
