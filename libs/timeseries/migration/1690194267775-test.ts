import { MigrationInterface, QueryRunner } from 'typeorm';

export class Test1690194267775 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('SELECT create_hypertable(\'order_snapshots\',\'created_at\');');
  }

  public async down(): Promise<void> {
    // a hypertable cannot be dropped
  }
}
