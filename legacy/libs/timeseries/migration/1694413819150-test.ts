import { MigrationInterface, QueryRunner } from 'typeorm';

export class Test1694413819150 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE grid_business_snapshot_1_d ADD COLUMN fs_consumption_kwh float8 NULL;');
    await queryRunner.query('ALTER TABLE grid_business_snapshot_1_d ADD COLUMN hps_consumption_kwh float8 NULL;');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE grid_business_snapshot_1_d drop COLUMN fs_consumption_kwh;');
    await queryRunner.query('ALTER TABLE grid_business_snapshot_1_d drop COLUMN hps_consumption_kwh;');
  }
}
