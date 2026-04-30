import { CoreEntity } from '@core/types/core-entity';
import { SolcastRequestType } from '@core/types/solcast-type';
import { Column, Entity } from 'typeorm';

@Entity('solcast_cache')
export class SolcastCache extends CoreEntity {

  // @Column('enum', { enum: SolcastRequestType })
  @Column('varchar')
    request_type: SolcastRequestType;

  @Column({ type: 'decimal', precision: 8, scale: 6 })
    latitude: number;

  @Column({ type: 'decimal', precision: 9, scale: 6 })
    longitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
    tilt: number;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
    azimuth: number;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
    capacity_kwp: number;

  @Column('varchar')
    install_date: string;

  @Column('text')
    response: string;
}
