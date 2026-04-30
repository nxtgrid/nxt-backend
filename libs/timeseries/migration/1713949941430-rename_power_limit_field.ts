import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenamePowerLimitField1713949941430 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE meter_snapshot_1_h RENAME COLUMN power_limit TO power_limit_kwh;');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE meter_snapshot_1_h RENAME COLUMN power_limit_kwh TO power_limit;');
  }
}
