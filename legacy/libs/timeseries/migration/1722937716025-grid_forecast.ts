import { MigrationInterface, QueryRunner } from 'typeorm';

export class GridForecast1722937716025 implements MigrationInterface {
  name = 'GridForecast1722937716025';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE "grid_forecast_snapshot_1_h" ("created_at" TIMESTAMP NOT NULL, "grid_id" integer NOT NULL, "grid_name" character varying, "organization_id" integer, "organization_name" character varying, "updated_at" TIMESTAMP NOT NULL, "period_start" TIMESTAMP NOT NULL, "solar_yield_kwh" double precision, "consumption_kwh" double precision, CONSTRAINT "PK_29611e884d874b556c793ab34a1" PRIMARY KEY ("grid_id", "period_start"))');
    await queryRunner.query('SELECT create_hypertable(\'grid_forecast_snapshot_1_h\',\'period_start\');');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "public"."grid_forecast_snapshot_1_h_created_at_idx"');
    await queryRunner.query('DROP TABLE "grid_forecast_snapshot_1_h"');
  }

}
