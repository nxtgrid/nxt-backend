import { MigrationInterface, QueryRunner } from 'typeorm';

export class Test1688721020214 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE mppt_energy_snapshot_15_min ADD COLUMN external_id varchar NULL;');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE mppt_energy_snapshot_15_min drop COLUMN external_id;');
  }


}
