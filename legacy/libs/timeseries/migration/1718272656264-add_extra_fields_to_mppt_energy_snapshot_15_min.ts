import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExtraFieldsToMpptEnergySnapshot15Min1718272656264 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE mppt_energy_snapshot_15_min ADD COLUMN mppt_type varchar;');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE mppt_energy_snapshot_15_min DROP COLUMN mppt_type;');
  }
}
