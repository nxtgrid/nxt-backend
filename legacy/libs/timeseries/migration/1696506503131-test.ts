import { MigrationInterface, QueryRunner } from 'typeorm';

export class Test1696506503131 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE grid_business_snapshot_1_d ADD COLUMN connection_fee_revenue float8 NULL;');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE grid_business_snapshot_1_d drop COLUMN connection_fee_revenue;');
  }
}
