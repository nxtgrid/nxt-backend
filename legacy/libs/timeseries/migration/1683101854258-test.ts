import { MigrationInterface, QueryRunner } from 'typeorm';

export class Test1683101854258 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`create table "dcu_snapshot_1_min" (
            created_at timestamp not null,
            dcu_id int not null,
            dcu_external_reference varchar,
            dcu_external_system varchar,
            is_online boolean,
            grid_id int, 
            grid_name varchar,
            organization_id int,
            organization_name varchar,
            PRIMARY KEY (created_at, dcu_id)
        )`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('drop table "dcu_snapshot_1_min"');
  }
}
