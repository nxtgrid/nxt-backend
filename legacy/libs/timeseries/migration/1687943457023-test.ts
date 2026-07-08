import { MigrationInterface, QueryRunner } from 'typeorm';

export class Test1687943457023 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('SELECT create_hypertable(\'mppt_energy_snapshot_15_min\',\'created_at\');');
  }

  public async down(): Promise<void> {
    // cannot drop hypertable
  }

}
