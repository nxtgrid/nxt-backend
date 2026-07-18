import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddingOrdersToFdw1733220594272 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('create type "public"."orders_currency_enum" as enum (\'USD\', \'NGN\', \'EUR\');');
    await queryRunner.query('create type "public"."orders_external_system_enum" as enum (\'STEAMACO\', \'CALIN\', \'SOLCAST\', \'VICTRON\', \'FLUTTERWAVE\', \'AFRICASTALKING\', \'JOTFORM\', \'EPICOLLECT\', \'JIRA\', \'TELEGRAM\', \'ZEROTIER\', \'MAKE\', \'FLOW_XO\', \'SENDGRID\');');
    await queryRunner.query('create type "public"."orders_meta_author_type_enum" as enum (\'AGENT\', \'MEMBER\', \'CUSTOMER\');');
    await queryRunner.query('create type "public"."orders_meta_order_type_enum" as enum (\'ENERGY_TOPUP\', \'CONNECTION_PAYMENT\', \'CONNECTION_REFUND\', \'AGENT_WITHDRAWAL\', \'AGENT_TOPUP\', \'ORGANIZATION_TOPUP\', \'ORGANIZATION_WITHDRAWAL\');');
    await queryRunner.query('create type "public"."orders_meta_receiver_type_enum" as enum (\'BANKING_SYSTEM\', \'ORGANIZATION\', \'CONNECTION\', \'METER\', \'AGENT\');');
    await queryRunner.query('create type "public"."orders_meta_sender_type_enum" as enum (\'BANKING_SYSTEM\', \'ORGANIZATION\', \'CONNECTION\', \'METER\', \'AGENT\');');
    await queryRunner.query('create type "public"."orders_order_status_enum" as enum (\'INITIALISED\', \'PENDING\', \'COMPLETED\', \'FAILED\', \'CANCELLED\', \'TIMED_OUT\', \'IGNORED\');');
    await queryRunner.query('create type "public"."orders_payment_channel_enum" as enum (\'USSD\', \'AYRTON\', \'NIFFLER\', \'TELEGRAM\');');
    await queryRunner.query('create type "public"."orders_payment_method_enum" as enum (\'CREDIT_CARD\', \'USSD\', \'BANK_TRANSFER\');');
    await queryRunner.query('create type "public"."orders_tariff_type_enum" as enum (\'HPS\', \'FS\')');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TYPE orders_tariff_type_enum;');
    await queryRunner.query('DROP TYPE orders_payment_method_enum;');
    await queryRunner.query('DROP TYPE orders_payment_channel_enum;');
    await queryRunner.query('DROP TYPE orders_order_status_enum;');
    await queryRunner.query('DROP TYPE orders_meta_sender_type_enum;');
    await queryRunner.query('DROP TYPE orders_meta_receiver_type_enum;');
    await queryRunner.query('DROP TYPE orders_meta_order_type_enum;');
    await queryRunner.query('DROP TYPE orders_meta_author_type_enum;');
    await queryRunner.query('DROP TYPE orders_external_system_enum;');
    await queryRunner.query('DROP TYPE orders_currency_enum;');
  }

}
