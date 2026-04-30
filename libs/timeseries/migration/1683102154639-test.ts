import { MigrationInterface, QueryRunner } from 'typeorm';

export class Test1683102154639 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('SELECT create_hypertable(\'dcu_snapshot_1_min\',\'created_at\');');
  }

  public async down(): Promise<void> {
    // a hypertable cannot be dropped
  }

}
