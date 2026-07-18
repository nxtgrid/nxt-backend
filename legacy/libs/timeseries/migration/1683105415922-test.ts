import { MigrationInterface, QueryRunner } from 'typeorm';

export class Test1683105415922 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`create table "grid_energy_snapshot_15_min" (
            created_at timestamp not null,
            grid_id int not null,
            total_consumption_kwh float8,
            a1 float8,
            a2 float8,
            a3 float8,
            is_fs_active boolean,
            is_hps_on boolean,
            bs float8,
            bv float8,
            bc float8,
            bst float8,
            mcc float8,
            grid_name varchar,
            organization_id int,
            organization_name varchar,
            PRIMARY KEY (created_at, grid_id)
        )`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('drop table "grid_energy_snapshot_15_min"');
  }

}
