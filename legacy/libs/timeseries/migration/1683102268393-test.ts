import { MigrationInterface, QueryRunner } from 'typeorm';

export class Test1683102268393 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`create table "grid_business_snapshot_1_d" (
            created_at timestamp not null,
            grid_id int not null,
            grid_name varchar,
            organization_id int,
            organization_name varchar,
            revenue float8,
            kwp float8,
            kwh float8,
            monthly_rental float8,
            residential_connection_count int,
            commercial_connection_count int,
            public_connection_count int,
            total_connection_count int,
            women_impacted_count int,
            fs_meter_count int,
            hps_meter_count int,
            total_meter_count int,
            customer_count int,
            fs_tariff float4,
            hps_tariff float4,
            daily_rental float8,
            no_communication_issue_count int,
            no_consumption_issue_count int,
            no_credit_issue_count int,
            total_issue_count int,
            PRIMARY KEY (created_at, grid_id)
        )`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('drop table "grid_business_snapshot_1_min"');
  }

}
