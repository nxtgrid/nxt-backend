import { MigrationInterface, QueryRunner } from 'typeorm';

export class Test1683105585641 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('SELECT create_hypertable(\'grid_energy_snapshot_15_min\',\'created_at\');');
  }

  public async down(): Promise<void> {
    // hypertables cannot be dropped
  }

}
