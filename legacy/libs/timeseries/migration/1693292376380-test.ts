import { MigrationInterface, QueryRunner } from 'typeorm';

export class Test1693292376380 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE mppt_forecast_snapshot_3_h ADD COLUMN forecast_kw_6_h_refers_to timestamp NULL;');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE mppt_forecast_snapshot_3_h drop COLUMN forecast_kw_6_h_refers_to;');
  }
}
