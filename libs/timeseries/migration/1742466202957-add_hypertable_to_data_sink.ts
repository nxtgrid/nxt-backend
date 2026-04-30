import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHypertableToDataSink1742466202957 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('SELECT create_hypertable(\'device_data_sink\',\'timestamp\');');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.info(queryRunner);
    // A hypertable cannot be dropped
  }
}
