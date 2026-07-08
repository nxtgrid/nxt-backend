import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropTable1722937597910 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "grid_forecast_snapshot_1_h"');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE "grid_forecast_snapshot_1_h" ("created_at" TIMESTAMP NOT NULL, "grid_id" integer NOT NULL, "grid_name" character varying, "organization_id" integer, "organization_name" character varying, "updated_at" TIMESTAMP NOT NULL, "period_start" TIMESTAMP NOT NULL, "solar_yield_kwh" double precision, "consumption_kwh" double precision, CONSTRAINT "PK_29f61f5cfe8dc2cbd15eceda457" PRIMARY KEY ("created_at", "grid_id"))');
  }

}
