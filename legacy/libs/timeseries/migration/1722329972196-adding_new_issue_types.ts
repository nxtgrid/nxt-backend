import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddingNewIssueTypes1722329972196 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE grid_business_snapshot_1_d ADD COLUMN not_activated_issue_count int NULL;');
    await queryRunner.query('ALTER TABLE grid_business_snapshot_1_d ADD COLUMN tamper_issue_count int NULL;');
    await queryRunner.query('ALTER TABLE grid_business_snapshot_1_d ADD COLUMN power_limit_breached_issue_count int NULL;');
    await queryRunner.query('ALTER TABLE grid_business_snapshot_1_d ADD COLUMN over_voltage_issue_count int NULL;');
    await queryRunner.query('ALTER TABLE grid_business_snapshot_1_d ADD COLUMN low_voltage_issue_count int NULL;');
    await queryRunner.query('ALTER TABLE grid_business_snapshot_1_d ADD COLUMN unexpected_power_limit_issue_count int NULL;');
    await queryRunner.query('ALTER TABLE grid_business_snapshot_1_d ADD COLUMN unexpected_meter_status_issue_count int NULL;');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE grid_business_snapshot_1_d DROP COLUMN unexpected_meter_status_issue_count;');
    await queryRunner.query('ALTER TABLE grid_business_snapshot_1_d DROP COLUMN unexpected_power_limit_issue_count;');
    await queryRunner.query('ALTER TABLE grid_business_snapshot_1_d DROP COLUMN low_voltage_issue_count;');
    await queryRunner.query('ALTER TABLE grid_business_snapshot_1_d DROP COLUMN over_voltage_issue_count;');
    await queryRunner.query('ALTER TABLE grid_business_snapshot_1_d DROP COLUMN power_limit_breached_issue_count;');
    await queryRunner.query('ALTER TABLE grid_business_snapshot_1_d DROP COLUMN tamper_issue_count;');
    await queryRunner.query('ALTER TABLE grid_business_snapshot_1_d DROP COLUMN not_activated_issue_count;');
  }
}
