import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenamePowerLimitFieldsAgain1714400562554 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE meter_snapshot_1_h DROP COLUMN power_limit_kw;');
    await queryRunner.query('ALTER TABLE meter_snapshot_1_h DROP COLUMN power_limit_kw_should_be;');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE meter_snapshot_1_h ADD COLUMN power_limit int;');
    await queryRunner.query('ALTER TABLE meter_snapshot_1_h ADD COLUMN power_limit_kw_should_be int;');
  }

}
