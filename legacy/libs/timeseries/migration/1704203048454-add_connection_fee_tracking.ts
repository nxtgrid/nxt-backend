import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConnectionFeeTracking1704203048454 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE grid_business_snapshot_1_d ADD COLUMN fs_single_phase_connection_fee float4;');
    await queryRunner.query('ALTER TABLE grid_business_snapshot_1_d ADD COLUMN hps_single_phase_connection_fee float4;');
    await queryRunner.query('ALTER TABLE grid_business_snapshot_1_d ADD COLUMN fs_three_phase_connection_fee float4;');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE grid_business_snapshot_1_d drop COLUMN fs_three_phase_connection_fee;');
    await queryRunner.query('ALTER TABLE grid_business_snapshot_1_d drop COLUMN hps_single_phase_connection_fee;');
    await queryRunner.query('ALTER TABLE grid_business_snapshot_1_d drop COLUMN fs_single_phase_connection_fee;');
  }

}
