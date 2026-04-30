import { MigrationInterface, QueryRunner } from 'typeorm';

export class MpptAssetSnapshot1D1722925537218 implements MigrationInterface {
  name = 'MpptAssetSnapshot1D1722925537218';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE INDEX "mppt_asset_snapshot_1_d_created_at_idx" ON "mppt_asset_snapshot_1_d" ("mppt_id", "created_at") ');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "public"."mppt_asset_snapshot_1_d_created_at_idx"');
  }

}
