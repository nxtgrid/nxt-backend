import { Entity, Column, JoinColumn, ManyToOne } from 'typeorm';
import { CoreEntity } from '@core/types/core-entity';
import { Customer } from '@core/modules/customers/entities/customer.entity';
import { Connection } from '@core/modules/connections/entities/connection.entity';
import { Meter } from '@core/modules/meters/entities/meter.entity';
import { Account } from '@core/modules/accounts/entities/account.entity';

@Entity('notes')
export class Note extends CoreEntity {
  @Column('varchar', { nullable: true })
    message: string;

  @ManyToOne(() => Customer, customer => customer.notes)
  @JoinColumn({ name: 'customer_id' })
    customer: Customer;

  @Column('int', { nullable: true })
    customer_id: number;

  @ManyToOne(() => Connection, connection => connection.notes)
  @JoinColumn({ name: 'connection_id' })
    connection: Connection;

  @Column('int', { nullable: true })
    connection_id: number;

  @ManyToOne(() => Meter, meter => meter.notes)
  @JoinColumn({ name: 'meter_id' })
    meter: Meter;

  @Column('int', { nullable: true })
    meter_id: number;

  @ManyToOne(() => Account, account => account.notes)
  @JoinColumn({ name: 'author_id' })
    author: Account;

  @Column('int', { nullable: true })
    author_id: number;
}
