import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShouldFsBeOnToGridEnergyTable1703020648944 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min ADD COLUMN should_fs_be_on boolean;');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min drop COLUMN should_fs_be_on;');
  }
}
