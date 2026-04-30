import { MigrationInterface, QueryRunner } from 'typeorm';

export class Test1688718990786 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`SELECT add_continuous_aggregate_policy('grid_estimated_actual_snapshot_30_min',
        start_offset => INTERVAL '3 hours',
        end_offset => INTERVAL '1 hour',
        schedule_interval => INTERVAL '3 hours');`);
  }

  public async down(): Promise<void> {
    // can't drop a refresh policy
  }

}
