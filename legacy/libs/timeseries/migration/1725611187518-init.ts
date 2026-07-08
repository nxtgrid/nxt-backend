import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1725611187518 implements MigrationInterface {
  name = 'Init1725611187518';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE "exchange_rate_snapshot_1_d" ("period_start" TIMESTAMP NOT NULL, "from_currency" character varying NOT NULL, "to_currency" character varying NOT NULL, "value" double precision, CONSTRAINT "PK_c413d63f61c863c4bd13dee8972" PRIMARY KEY ("period_start", "from_currency", "to_currency"))');
    await queryRunner.query('SELECT create_hypertable(\'exchange_rate_snapshot_1_d\',\'period_start\');');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "exchange_rate_snapshot_1_d"');
  }

}
