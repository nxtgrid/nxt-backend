import { MigrationInterface, QueryRunner } from 'typeorm';

export class Test1683106761507 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`SELECT add_continuous_aggregate_policy('dcu_snapshot_15_min',
        start_offset => INTERVAL '60 minutes',
        end_offset => INTERVAL '1 minute',
        schedule_interval => INTERVAL '1 minute');`);
  }

  public async down(): Promise<void> {
    // can't drop a refresh policy
  }

}
