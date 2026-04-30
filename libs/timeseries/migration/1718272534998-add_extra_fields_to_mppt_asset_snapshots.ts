import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExtraFieldsToMpptAssetSnapshots1718272534998 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE mppt_asset_snapshot_1_d ADD COLUMN mppt_type varchar;');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE mppt_asset_snapshot_1_d DROP COLUMN mppt_type;');
  }
}
