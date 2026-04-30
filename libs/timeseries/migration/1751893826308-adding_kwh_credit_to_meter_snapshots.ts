import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddingKwhCreditToMeterSnapshots1751893826308 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "meter_snapshot_1_h" ADD "kwh_credit_available" float4');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "meter_snapshot_1_h" DROP COLUMN "kwh_credit_available"');
  }
}
