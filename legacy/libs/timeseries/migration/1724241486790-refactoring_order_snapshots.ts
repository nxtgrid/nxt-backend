import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactoringOrderSnapshots1724241486790 implements MigrationInterface {
  name = 'RefactoringOrderSnapshots1724241486790';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "order_snapshots" ADD "is_hidden_from_reporting" boolean');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "order_snapshots" DROP COLUMN "is_hidden_from_reporting"');
  }

}
