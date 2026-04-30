import { MigrationInterface, QueryRunner } from 'typeorm';

export class Test1683106905132 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`SELECT add_continuous_aggregate_policy('dcu_snapshot_1_h',
        start_offset => INTERVAL '3 hour',
        end_offset => INTERVAL '1 minutes',
        schedule_interval => INTERVAL '5 minutes');`);
  }

  public async down(): Promise<void> {
    // cannot drop refresh policy
  }
}
