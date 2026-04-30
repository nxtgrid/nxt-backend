import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddingKwhCreditToMeterSnapshots1751893826309 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE predicted_consumption ( \
      id SERIAL PRIMARY KEY, \
      created_at TIMESTAMP NOT NULL DEFAULT now(), \
      grid_id INTEGER NOT NULL, \
      service_type TEXT NOT NULL, \
      period_start TIMESTAMP NOT NULL, \
      hour INTEGER NOT NULL, \
      min INTEGER NOT NULL, \
      predicted_consumption_kw FLOAT, \
      prediction_context JSON NOT NULL, \
      meta JSONB \
    ); ');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.info(queryRunner);
    // hypertables cannot be dropped
  }
}
