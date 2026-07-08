import { MigrationInterface, QueryRunner } from 'typeorm';

export class Test1683105379191 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('SELECT create_hypertable(\'grid_business_snapshot_1_d\',\'created_at\');');
  }

  public async down(): Promise<void> {
    // a hypertable cannot be dropped
  }
}
