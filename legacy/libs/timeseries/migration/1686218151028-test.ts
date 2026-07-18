import { MigrationInterface, QueryRunner } from 'typeorm';

export class Test1686218151028 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`create table "mppt_forecast_3_h" (
            created_at timestamp not null,
            mppt_id int not null,
            mppt_external_reference varchar,
            mppt_external_system varchar,
            mppt_latitude float8,
            mppt_longitude float8,
            mppt_tilt float8,
            mppt_position_vertical varchar,
            mppt_position_horizontal varchar,
            mppt_installed_at timestamp,
            mppt_azimuth float8,
            mppt_kw float8,
            grid_id int,
            grid_name varchar,
            organization_id int,
            organization_name varchar,
            forecast_kw_3_h float8,
            forecast_kw_6_h float8,
            forecast_kw_12_h float8,
            forecast_kw_24_h float8,
            PRIMARY KEY (created_at, mppt_id)
        )`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('drop table "mppt_forecast_3_h"');
  }

}
