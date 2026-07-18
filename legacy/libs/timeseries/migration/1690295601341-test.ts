import { MigrationInterface, QueryRunner } from 'typeorm';

export class Test1690295601341 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min ADD COLUMN pc float8 NULL;');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min drop COLUMN pc;');
  }

}
