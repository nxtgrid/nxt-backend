import { MigrationInterface, QueryRunner } from 'typeorm';

export class Test1683106867089 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE MATERIALIZED VIEW dcu_snapshot_1_h
        WITH (timescaledb.continuous) AS
        SELECT
        time_bucket('1 hour', "created_at") AS bucket,
        grid_id as grid_id,
        dcu_id as dcu_id,
        dcu_external_reference,
        dcu_external_system,
        grid_name,
        organization_id,
        organization_name,
        round(sum(is_online::int) / 60.0, 2) AS is_online
            FROM dcu_snapshot_1_min
            GROUP by 
                bucket,
                grid_id,
                dcu_id,
                dcu_external_reference,
                dcu_external_system,
                grid_name,
                organization_id,
                organization_name
            order by bucket desc
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('drop materialized view dcu_snapshot_1_h');
  }

}
