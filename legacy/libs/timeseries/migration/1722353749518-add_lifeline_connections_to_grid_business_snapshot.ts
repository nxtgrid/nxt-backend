import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLifelineConnectionsToGridBusinessSnapshot1722353749518 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE grid_business_snapshot_1_d ADD COLUMN lifeline_connection_count int NULL;');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE grid_business_snapshot_1_d DROP COLUMN lifeline_connection_count;');
  }
}
