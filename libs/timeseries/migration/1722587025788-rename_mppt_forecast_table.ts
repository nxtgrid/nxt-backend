import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameMpptForecastTable1722587025788 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE mppt_forecast_snapshot_1_h RENAME TO mppt_forecast_snapshot_30_min');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE mppt_forecast_snapshot_30_min RENAME TO mppt_forecast_snapshot_1_h');
  }
}
