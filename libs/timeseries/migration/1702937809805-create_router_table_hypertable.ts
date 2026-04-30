import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRouterTableHypertable1702937809805 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('SELECT create_hypertable(\'router_snapshot_1_min\',\'created_at\');');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.info(queryRunner); //adding this to make linter shut up
    //   hypertables cannot be dropped
  }

}
