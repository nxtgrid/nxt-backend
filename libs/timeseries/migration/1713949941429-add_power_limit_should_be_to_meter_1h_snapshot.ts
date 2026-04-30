import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPowerLimitShouldBeToMeter1hSnapshot1713949941429 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE meter_snapshot_1_h ADD COLUMN power_limit_should_be int;');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE meter_snapshot_1_h DROP COLUMN power_limit_should_be;');
  }

}
