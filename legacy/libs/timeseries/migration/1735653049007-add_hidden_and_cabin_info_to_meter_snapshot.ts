import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHiddenAndCabinInfoToMeterSnapshot1735653049007 implements MigrationInterface {
  name = 'AddHiddenAndCabinInfoToMeterSnapshot1735653049007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "meter_snapshot_1_h" ADD "is_hidden_from_reporting" boolean NOT NULL DEFAULT false');
    await queryRunner.query('ALTER TABLE "meter_snapshot_1_h" ADD "is_cabin_meter" boolean NOT NULL DEFAULT false');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "meter_snapshot_1_h" DROP COLUMN "is_cabin_meter"');
    await queryRunner.query('ALTER TABLE "meter_snapshot_1_h" DROP COLUMN "is_hidden_from_reporting"');
  }

}
