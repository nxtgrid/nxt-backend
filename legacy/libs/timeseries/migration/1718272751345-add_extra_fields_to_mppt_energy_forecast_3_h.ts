import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExtraFieldsToMpptEnergyForecast3H1718272751345 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE mppt_forecast_snapshot_3_h ADD COLUMN mppt_type varchar;');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE mppt_forecast_snapshot_3_h DROP COLUMN mppt_type;');
  }
}
