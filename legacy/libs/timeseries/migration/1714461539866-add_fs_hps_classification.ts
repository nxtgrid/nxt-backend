import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFsHpsClassification1714461539866 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE meter_snapshot_1_h ADD COLUMN is_fs_consumption boolean;');
    await queryRunner.query('ALTER TABLE meter_snapshot_1_h ADD COLUMN is_hps_consumption boolean;');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE meter_snapshot_1_h DROP COLUMN is_fs_consumption;');
    await queryRunner.query('ALTER TABLE meter_snapshot_1_h DROP COLUMN is_hps_consumption;');
  }
}
