import { MigrationInterface, QueryRunner } from 'typeorm';

export class Test1686218207546 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('SELECT create_hypertable(\'mppt_forecast_3_h\',\'created_at\');');
  }

  public async down(): Promise<void> {
    // cannot drop
  }

}
