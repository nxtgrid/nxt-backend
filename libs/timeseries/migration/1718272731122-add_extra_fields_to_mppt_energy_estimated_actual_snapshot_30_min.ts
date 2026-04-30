import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExtraFieldsToMpptEnergyEstimatedActualSnapshot30Min1718272731122 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE mppt_estimated_actual_snapshot_30_min ADD COLUMN mppt_type varchar;');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE mppt_estimated_actual_snapshot_30_min DROP COLUMN mppt_type;');
  }
}
