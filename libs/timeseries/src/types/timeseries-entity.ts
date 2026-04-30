import { PrimaryColumn } from 'typeorm';

export abstract class TimeseriesEntity {
  @PrimaryColumn({ type: 'timestamp', nullable: false })
    created_at: Date;
}
