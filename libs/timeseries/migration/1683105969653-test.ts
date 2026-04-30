import { MigrationInterface, QueryRunner } from 'typeorm';

export class Test1683105969653 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`create table "meter_snapshot_1_h" (
            created_at timestamp not null,
            meter_id int not null,
            meter_type varchar,
            meter_external_reference varchar,
            meter_external_system varchar,
            meter_phase varchar,
            customer_full_name varchar,
            customer_id int,
            dcu_id int,
            dcu_external_reference varchar,
            dcu_external_system varchar,
            grid_id int,
            organization_id int,
            grid_name varchar,
            organization_name varchar,
            consumption_kwh float8,
            PRIMARY KEY (created_at, meter_id)
        )`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('drop table "meter_snapshot_1_h"');
  }

}
