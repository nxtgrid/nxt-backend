import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropLoanId1718866357335 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE order_snapshots drop COLUMN loan_id;');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE order_snapshots ADD COLUMN loan_id int4;');
  }

}
