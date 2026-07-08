import { MigrationInterface, QueryRunner } from 'typeorm';

export class Test1688717812928 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE mppt_forecast_snapshot_30_min RENAME TO mppt_estimated_actual_snapshot_30_min;');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE mppt_estimated_actual_snapshot_30_min RENAME TO mppt_forecast_snapshot_30_min;');
  }

}
