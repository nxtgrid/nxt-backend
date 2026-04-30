import { Column, DeleteDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne } from 'typeorm';
import { Customer } from '@core/modules/customers/entities/customer.entity';
import { Meter } from '@core/modules/meters/entities/meter.entity';
import { CoreEntity } from '@core/types/core-entity';
import { Wallet } from '@core/modules/wallets/entities/wallet.entity';
// import { Audit } from '@core/modules/audits/entities/audit.entity';
import { Note } from '@core/modules/notes/entities/note.entity';
// import { ConnectionRequestedMeter } from '@core/modules/connection-requested-meters/entities/connection-requested-meter.entity';
import { CurrencyEnum, ExternalSystemEnum, IdDocumentTypeEnum } from '@core/types/supabase-types';

@Entity('connections')
export class Connection extends CoreEntity {
  @DeleteDateColumn({ type: 'timestamp', precision: 3, nullable: true })
    deleted_at?: Date;

  // @Column('enum', { enum: IdDocumentTypeEnum, nullable: true, default: IdDocumentTypeEnum.PASSPORT })
  @Column({ type: 'varchar' })
    document_type?: IdDocumentTypeEnum;

  @Column('varchar', { nullable: true })
    document_id?: string;

  @Column('varchar', { nullable: true })
    upload_uuid?: string;

  // @Column('enum', { enum: ExternalSystemEnum, nullable: true, default: ExternalSystemEnum.EPICOLLECT })
  @Column({ type: 'varchar' })
    external_system?: ExternalSystemEnum;

  @Column('float', { default: 0 })
    paid?: number;

  // @Column('enum', { enum: CurrencyEnum })
  @Column({ type: 'varchar' })
    currency?: CurrencyEnum;

  @Column('int')
    women_impacted?: number;

  @Column('bool', { nullable: true })
    is_lifeline?: boolean;

  @Column('bool')
    is_public?: boolean;

  @Column('bool')
    is_commercial?: boolean;

  @Column('bool')
    is_residential?: boolean;

  @Column('bool', { default: false, nullable: true })
    is_building_wired?: boolean;

  @Column('bool', { default: false, nullable: true })
    is_using_led_bulbs?: boolean;

  /**
   * Relations
  **/

  @Column('int', { nullable: true })
    customer_id?: number;

  @ManyToOne(() => Customer, customer => customer.connections)
  @JoinColumn({ name: 'customer_id' })
    customer?: Customer;

  @OneToOne(() => Wallet, wallet => wallet.connection)
    wallet?: Wallet;

  // @OneToMany(() => ConnectionRequestedMeter, connectionRequestedMeter => connectionRequestedMeter.connection)
  //   connection_requested_meters?: ConnectionRequestedMeter[];

  @OneToMany(() => Meter, meter => meter.connection)
    meters?: Meter[];

  @OneToMany(() => Note, note => note.connection)
    notes?: Note[];

  // @OneToMany(() => Audit, audit => audit.connection)
  //   audits?: Audit[];
}
