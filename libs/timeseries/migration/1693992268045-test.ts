import { MigrationInterface, QueryRunner } from 'typeorm';

export class Test1693992268045 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE grid_business_snapshot_1_d ADD COLUMN daily_cuf float8 NULL;');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE grid_business_snapshot_1_d drop COLUMN daily_cuf;');
  }

}
