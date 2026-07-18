import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExtraFieldsToMpptEnergyForecast1H1718272745257 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE mppt_forecast_snapshot_1_h ADD COLUMN mppt_type varchar;');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE mppt_forecast_snapshot_1_h DROP COLUMN mppt_type;');
  }
}
