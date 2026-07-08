// import { Column, Entity, OneToMany } from 'typeorm';
// import { CoreEntity } from '@core/types/core-entity';
// import { Directive } from '@core/modules/directives/entities/directive.entity';
// import { Meter } from '@core/modules/meters/entities/meter.entity';

// @Entity('directive_watchdog_sessions')
// export class DirectiveWatchdogSession extends CoreEntity {
//   @OneToMany(() => Directive, directive => directive.directive_watchdog_session)
//     directives: Directive[];

//   @Column('varchar', { nullable: true })
//     identifier: string;

//   @OneToMany(() => Meter, meter => meter.watchdog_session)
//     meters: Meter[];
// }
