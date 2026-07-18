import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCaToGridEnergyTable1721980825122 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min ADD COLUMN battery_capacity_ca_ah float8;');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE grid_energy_snapshot_15_min drop COLUMN battery_capacity_ca_ah;');
  }
}
