import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRouterTableMaterializedView15Min1702938239851 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE MATERIALIZED VIEW router_snapshot_15_min
            WITH (timescaledb.continuous) AS
            SELECT
            time_bucket('15 min', "created_at") AS bucket,
            grid_id as grid_id,
            router_id as router_id,
            router_external_reference,
            router_external_system,
            grid_name,
            organization_id,
            organization_name,
            round(sum(is_online::int) / 15.0, 2) AS is_online
                FROM router_snapshot_1_min
                GROUP by 
                    bucket,
                    grid_id,
                    router_id,
                    router_external_reference,
                    router_external_system,
                    grid_name,
                    organization_id,
                    organization_name
                order by bucket desc
            `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('drop materialized view router_snapshot_15_min');
  }

}
