import { MigrationInterface, QueryRunner } from 'typeorm';

export class Test1683106301541 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('SELECT create_hypertable(\'organization_snapshot_1_d\',\'created_at\');');
  }

  public async down(): Promise<void> {
    // cannot drop a hypertable
  }

}
