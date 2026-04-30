import { MigrationInterface, QueryRunner } from 'typeorm';

export class Test1694413998176 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE grid_business_snapshot_1_d RENAME COLUMN daily_cuf TO cuf;');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE grid_business_snapshot_1_d RENAME COLUMN cuf TO daily_cuf;');
  }
}
