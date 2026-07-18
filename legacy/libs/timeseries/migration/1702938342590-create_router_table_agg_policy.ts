import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRouterTableAggPolicy1702938342590 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`SELECT add_continuous_aggregate_policy('router_snapshot_15_min',
        start_offset => INTERVAL '60 minutes',
        end_offset => INTERVAL '1 minute',
        schedule_interval => INTERVAL '1 minute');`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.info(queryRunner);
    //   can't drop a refresh policy
  }

}
