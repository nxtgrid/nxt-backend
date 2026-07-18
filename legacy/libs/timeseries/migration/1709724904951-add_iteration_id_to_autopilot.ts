import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIterationIdToAutopilot1709724904951 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE autopilot_solutions_30_min ADD COLUMN iteration int;');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE autopilot_solutions_30_min drop COLUMN int;');
  }

}
