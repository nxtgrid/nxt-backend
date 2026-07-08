import { MigrationInterface, QueryRunner } from 'typeorm';

export class Test1742465282563 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE "device_data_sink" ("created_at" TIMESTAMP NOT NULL, "timestamp" TIMESTAMP NOT NULL, "device_id" int8 not null, "data" JSONB, "meta" JSONB)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "device_data_sink";');
  }

}
