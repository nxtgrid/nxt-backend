import { MigrationInterface, QueryRunner } from 'typeorm';

export class Test1687943380756 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('SELECT create_hypertable(\'mppt_forecast_snapshot_30_min\',\'created_at\');');
  }

  public async down(): Promise<void> {
    // cannot drop hypertable
  }

}
