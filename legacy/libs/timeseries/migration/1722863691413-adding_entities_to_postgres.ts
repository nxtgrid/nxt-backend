import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddingEntitiesToPostgres1722863691413 implements MigrationInterface {
  name = 'AddingEntitiesToPostgres1722863691413';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE "grid_forecast_snapshot_1_h" ("created_at" TIMESTAMP NOT NULL, "grid_id" integer NOT NULL, "grid_name" character varying, "organization_id" integer, "organization_name" character varying, "updated_at" TIMESTAMP NOT NULL, "period_start" TIMESTAMP NOT NULL, "solar_yield_kwh" double precision, "consumption_kwh" double precision, CONSTRAINT "PK_29f61f5cfe8dc2cbd15eceda457" PRIMARY KEY ("created_at", "grid_id"))');
    await queryRunner.query('SELECT create_hypertable(\'grid_forecast_snapshot_1_h\',\'created_at\');');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "grid_forecast_snapshot_1_h"');
    //   cannot drop hypertable
  }

}
