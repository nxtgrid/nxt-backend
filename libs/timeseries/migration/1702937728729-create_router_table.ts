import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRouterTable1702937728729 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`create table "router_snapshot_1_min" (
            created_at timestamp not null,
            router_id int not null,
            router_external_reference varchar,
            router_external_system varchar,
            is_online boolean,
            grid_id int, 
            grid_name varchar,
            organization_id int,
            organization_name varchar,
            PRIMARY KEY (created_at, router_id)
        )`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('drop table "router_snapshot_1_min"');
  }

}
