import { MigrationInterface, QueryRunner } from 'typeorm';

export class Test1694696781281 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE grid_business_snapshot_1_d ADD COLUMN total_estimated_mppt_production_kwh float8 NULL;');
    await queryRunner.query('ALTER TABLE grid_business_snapshot_1_d ADD COLUMN total_mppt_production_kwh float8 NULL;');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE grid_business_snapshot_1_d drop COLUMN total_estimated_mppt_production_kwh;');
    await queryRunner.query('ALTER TABLE grid_business_snapshot_1_d drop COLUMN total_mppt_production_kwh;');
  }

}
