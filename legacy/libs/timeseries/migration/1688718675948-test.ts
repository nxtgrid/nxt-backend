import { MigrationInterface, QueryRunner } from 'typeorm';

export class Test1688718675948 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE MATERIALIZED VIEW grid_estimated_actual_snapshot_30_min
            WITH (timescaledb.continuous) AS
            SELECT
            time_bucket('30 min', "created_at") AS bucket,
            grid_id,
            grid_name,
            organization_id,
            organization_name,
            sum(estimated_actual_kw) as estimated_actual_kw
            FROM mppt_estimated_actual_snapshot_30_min
                GROUP by 
                    bucket,
                    grid_id,
                    grid_name,
                    organization_id,
                    organization_name
                order by bucket desc`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('drop materialized view grid_estimated_actual_snapshot_30_min');
  }

}
