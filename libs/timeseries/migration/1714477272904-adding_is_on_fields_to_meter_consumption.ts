import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddingIsOnFieldsToMeterConsumption1714477272904 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE meter_snapshot_1_h ADD COLUMN is_on boolean;');
    await queryRunner.query('ALTER TABLE meter_snapshot_1_h ADD COLUMN should_be_on boolean;');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE meter_snapshot_1_h DROP COLUMN is_on;');
    await queryRunner.query('ALTER TABLE meter_snapshot_1_h DROP COLUMN should_be_on;');
  }

}
