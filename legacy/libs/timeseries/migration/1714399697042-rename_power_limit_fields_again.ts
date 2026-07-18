import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenamePowerLimitFieldsAgain1714399697042 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE meter_snapshot_1_h RENAME COLUMN power_limit_kwh TO power_limit_kw;');
    await queryRunner.query('ALTER TABLE meter_snapshot_1_h RENAME COLUMN power_limit_kwh_should_be TO power_limit_kw_should_be;');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE meter_snapshot_1_h RENAME COLUMN power_limit_kw TO power_limit_kwh;');
    await queryRunner.query('ALTER TABLE meter_snapshot_1_h RENAME COLUMN power_limit_kw_should_be TO power_limit_kwh_should_be;');
  }

}
