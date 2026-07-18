import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenamePowerLimitShouldBe1713949941431 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE meter_snapshot_1_h RENAME COLUMN power_limit_should_be TO power_limit_kwh_should_be;');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE meter_snapshot_1_h RENAME COLUMN power_limit_kwh_should_be TO power_limit_should_be;');
  }
}
