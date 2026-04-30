import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAutopilotDebugger1709324026562 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`create table "autopilot_solutions_30_min" (
            created_at timestamp not null,
            grid_id int,
            grid_name varchar,
            index int,
            score float8,
            uptime_hps_hours_weighted float8,
            uptime_fs_hours_actual float8,
            uptime_fs_hours_actual_weighted float8,
            curtailment_hours float8,
            fs_target_hours float8,
            turn_on_index float8,
            turn_off_index float8,
            turn_on_local_time timestamp,
            turn_off_local_time timestamp
        )`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('drop table "autopilot_solutions_30_min"');
  }
}
