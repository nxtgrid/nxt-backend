import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConnectionIdToMeterSnapshot1H1722349023421 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE meter_snapshot_1_h ADD COLUMN connection_id int NULL;');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE meter_snapshot_1_h DROP COLUMN connection_id;');
  }
}
