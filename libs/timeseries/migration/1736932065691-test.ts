import { MigrationInterface, QueryRunner } from 'typeorm';

export class Test1736932065691 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "meter_snapshot_1_h" ADD "counter_kwh" float4');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "meter_snapshot_1_h" DROP COLUMN "counter_kwh"');
  }

}
