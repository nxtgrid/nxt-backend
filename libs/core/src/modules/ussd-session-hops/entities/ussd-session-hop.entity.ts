import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { CoreEntity } from '@core/types/core-entity';
import { UssdSession } from '@core/modules/ussd-sessions/entities/ussd-session.entity';

@Entity('ussd_session_hops')
export class UssdSessionHop extends CoreEntity {
  @Column('varchar', { nullable: true })
    text: string;

  @Column('varchar', { nullable: true })
    phone: string;

  @Column('varchar', { nullable: true })
    network_code: string;

  @Column('varchar', { nullable: true })
    service_code: string;

  @ManyToOne(
    () => UssdSession,
    ussdSession => ussdSession.ussd_session_hops,
  )
  @JoinColumn({ name: 'ussd_session_id' })
    ussd_session: UssdSession;
}
