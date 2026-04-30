import { MigrationInterface, QueryRunner } from 'typeorm';

export class Test1683106145280 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('SELECT create_hypertable(\'meter_snapshot_1_h\',\'created_at\');');
  }

  public async down(): Promise<void> {
    // cannot drop hypertables
  }

}
