import { MigrationInterface, QueryRunner } from 'typeorm';

export class Test1693577910622 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min ADD COLUMN is_curtailing boolean;');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min drop COLUMN is_curtailing;');
  }
}

