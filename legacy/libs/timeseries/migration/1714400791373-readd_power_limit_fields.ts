import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReaddPowerLimitFields1714400791373 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE meter_snapshot_1_h ADD COLUMN power_limit_kw float8;');
    await queryRunner.query('ALTER TABLE meter_snapshot_1_h ADD COLUMN power_limit_kw_should_be float8;');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE meter_snapshot_1_h DROP COLUMN power_limit_kw;');
    await queryRunner.query('ALTER TABLE meter_snapshot_1_h DROP COLUMN power_limit_kw_should_be;');
  }

}
