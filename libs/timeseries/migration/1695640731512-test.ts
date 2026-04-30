import { MigrationInterface, QueryRunner } from 'typeorm';

export class Test1695640731512 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE grid_business_snapshot_1_d ADD COLUMN battery_modules_on_count int NULL;');
    await queryRunner.query('ALTER TABLE grid_business_snapshot_1_d ADD COLUMN battery_modules_off_count int NULL;');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE grid_business_snapshot_1_d drop COLUMN battery_modules_on_count;');
    await queryRunner.query('ALTER TABLE grid_business_snapshot_1_d drop COLUMN battery_modules_off_count;');
  }
}
