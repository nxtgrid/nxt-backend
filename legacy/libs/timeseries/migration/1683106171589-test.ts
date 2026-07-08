import { MigrationInterface, QueryRunner } from 'typeorm';

export class Test1683106171589 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`create table "organization_snapshot_1_d" (
            created_at timestamp not null,
            organization_id int not null,
            grid_count int,
            organization_name varchar,
            PRIMARY KEY (created_at, organization_id)
        )`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('drop table "organization_snapshot_1_d"');
  }

}
