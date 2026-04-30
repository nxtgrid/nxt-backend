import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameRevenueInGridBusinessSnapshot1D1700487583187 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE grid_business_snapshot_1_d RENAME COLUMN revenue TO energy_topup_revenue;');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE grid_business_snapshot_1_d RENAME COLUMN energy_topup_revenue TO revenue;');
  }
}
