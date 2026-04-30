import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1725611620912 implements MigrationInterface {
  name = 'Init1725611620912';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "exchange_rate_snapshot_1_d" ADD "created_at" TIMESTAMP NOT NULL');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "exchange_rate_snapshot_1_d" DROP COLUMN "created_at"');
  }

}
