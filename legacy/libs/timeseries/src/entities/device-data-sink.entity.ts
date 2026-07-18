import { TimeseriesEntity } from '@timeseries/types/timeseries-entity';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Index('device_data_sink_timestamp_idx', [ 'timestamp' ])
@Entity('device_data_sink')
export class DeviceDataSink extends TimeseriesEntity {
  @PrimaryColumn('int8')
    device_id: number;

  @PrimaryColumn({ type: 'timestamp', nullable: false })
    timestamp: Date;

  @Column('jsonb', { nullable: true })
    data: any;

  @Column('jsonb', { nullable: true })
    meta: any;
}
