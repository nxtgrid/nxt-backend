import { MigrationInterface, QueryRunner } from 'typeorm';

export class MpptForecastSnapshot1HYphertable1701174770898 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('SELECT create_hypertable(\'mppt_forecast_snapshot_1_h\',\'period_start\');');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.info(queryRunner); //just added this for the linter to shut up
    //   cannot drop hypertable
  }
}
