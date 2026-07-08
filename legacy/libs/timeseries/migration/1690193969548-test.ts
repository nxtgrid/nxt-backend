import { MigrationInterface, QueryRunner } from 'typeorm';

export class Test1690193969548 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`create table "order_snapshots" (
        order_id int,
        amount float8,
        created_at timestamp not null,
        currency varchar,
        sender_wallet_id int,
        receiver_wallet_id int,
        sender_type varchar,
        receiver_type varchar,
        sender_name varchar,
        receiver_name varchar,
        status varchar,
        external_reference varchar,
        loan_id int,
        created_by_id int,
        created_by_name varchar,
        payment_method varchar,
        payment_channel varchar,
        tariff_type varchar,
        tariff float8,
        sender_subtype varchar,
        receiver_subtype varchar,
        grid_name varchar,
        grid_id int,
        organization_name varchar,
        organization_id int,
        sender_is_hidden_from_reporting boolean,
        receiver_is_hidden_from_reporting boolean,
        PRIMARY KEY (order_id, created_at)
    )`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('drop table "order_snapshots"');
  }

}
