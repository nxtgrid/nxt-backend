import { MigrationInterface, QueryRunner } from 'typeorm';

export class Test1690295576111 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min ADD COLUMN pb float8 NULL;');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min drop COLUMN pb;');
  }

}
