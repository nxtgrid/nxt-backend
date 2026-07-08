import { Entity, Column, OneToMany, JoinColumn, ManyToOne, DeleteDateColumn } from 'typeorm';
import { Organization } from '@core/modules/organizations/entities/organization.entity';
import { CoreEntity } from '@core/types/core-entity';
import { Dcu } from '@core/modules/dcus/entities/dcu.entity';
import { Pole } from '@core/modules/poles/entities/pole.entity';
import { Agent } from '@core/modules/agents/entities/agent.entity';
import { Customer } from '@core/modules/customers/entities/customer.entity';
import { DirectiveBatch } from '@core/modules/directive-batches/entities/directive-batch.entity';
import { Mppt } from '@core/modules/mppts/entities/mppt.entity';
// import { Audit } from '@core/modules/audits/entities/audit.entity';
import { Issue } from '@core/modules/issues/entities/issue.entity';
import { Notification } from '@core/modules/notifications/entities/notification.entity';
import { Payout } from '@core/modules/payouts/entities/payout.entity';
import { Router } from '@core/modules/routers/entities/router.entity';
import { Member } from '@core/modules/members/entities/member.entity';
import { Order } from '@core/modules/orders/entities/order.entity';
import { ExternalSystemEnum, WeatherTypeEnum } from '@core/types/supabase-types';

@Entity('grids')
export class Grid extends CoreEntity {
  @DeleteDateColumn({ type: 'timestamp', precision: 3, nullable: true })
    deleted_at?: Date;

  @Column({ type: 'timestamptz', nullable: true, precision: 3 })
    deployed_at?: Date;

  @Column({ type: 'timestamptz', nullable: true, precision: 3 })
    commissioned_at?: Date;

  @Column('varchar')
    name?: string;

  @Column('bool', { default: false })
    is_hps_on?: boolean;

  @Column({ type: 'timestamptz', precision: 3, nullable: true })
    is_hps_on_updated_at?: Date;

  @Column('varchar', { nullable: true })
    walkthrough_external_id?: string;

  @Column('varchar', { default: 'Africa/Lagos' })
    timezone?: string;

  @Column('float', { default: 0 })
    kwp?: number;

  @Column('float', { default: 0 })
    kwh?: number;

  @Column('float', { default: 0 })
    kwp_tariff?: number;

  @Column('float', { default: 0 })
    kwh_tariff?: number;

  @Column('float', { default: 0 })
    kwh_tariff_essential_service?: number;

  @Column('float', { default: 0 })
    kwh_tariff_full_service?: number;

  // @Column('enum', { enum: WeatherTypeEnum, nullable: true })
  @Column({ type: 'varchar' })
    current_weather?: WeatherTypeEnum;

  // @Column('enum', { enum: ExternalSystemEnum, default: ExternalSystemEnum.VICTRON })
  @Column({ type: 'varchar' })
    generation_external_system?: ExternalSystemEnum;

  // @Column('enum', { enum: ExternalSystemEnum, default: ExternalSystemEnum.CALIN })
  @Column({ type: 'varchar' })
    metering_external_system?: ExternalSystemEnum;

  @Column('varchar', { nullable: true })
    generation_external_site_id?: string;

  @Column('varchar', { nullable: true })
    generation_external_gateway_id?: string;

  @Column({ type: 'timestamptz', precision: 3, nullable: true })
    generation_gateway_last_seen_at?: Date;

  @Column('bool', { default: false })
    is_fs_on?: boolean;

  @Column({ type: 'timestamptz', precision: 3, nullable: true })
    is_fs_on_updated_at?: Date;

  @Column('bool', { default: false })
    should_fs_be_on?: boolean;

  @Column({ type: 'timestamptz', precision: 3, nullable: true })
    should_fs_be_on_updated_at?: Date;

  @Column('float', { default: 0 })
    default_hps_connection_fee?: number;

  @Column('float', { default: 0 })
    default_fs_1_phase_connection_fee?: number;

  @Column('float', { default: 0 })
    default_fs_3_phase_connection_fee?: number;

  // this is a temp measure for when we start building functionality to calculate uptimes
  @Column('float', { default: 0 })
    monthly_rental?: number;

  @Column('boolean', { default: false })
    are_all_dcus_online?: boolean;

  @Column('boolean', { default: true })
    are_all_dcus_under_high_load_threshold?: boolean;

  @Column('boolean', { default: true })
    is_hidden_from_reporting?: boolean;

  @Column('bool', { default: false })
    is_three_phase_supported?: boolean;

  @Column('bool', { default: false })
    is_using_vsat?: boolean;

  @Column('bool', { default: false })
    is_using_mobile_network?: boolean;

  // this is the parameter used in yeti to define
  // when a grid has hps on or off. it is measured
  // as the minimum amount of energy used in a 60 min
  // period.
  @Column('float', { nullable: true })
    is_hps_on_threshold_kw?: number;

  @Column('float', { nullable: true })
    kwh_per_battery_module?: number;

  @Column('int', { nullable: true, unique: true })
    identifier?: number;

  @Column('int', { nullable: false, default: 5 })
    lifeline_connection_kwh_threshold?: number;

  @Column('int', { nullable: false, default: 30 })
    lifeline_connection_days_threshold?: number;

  @Column('int', { nullable: false, default: 30 })
    meter_consumption_issue_threshold_detection_days?: number;

  @Column('int', { nullable: false, default: 7 })
    meter_communication_issue_threshold_detection_days?: number;

  @Column('boolean', { default: false })
    uses_dual_meter_setup?: boolean;

  @Column('boolean', { default: false })
    is_panel_cleaning_notification_enabled?: boolean;

  @Column('boolean', { default: false })
    is_energised_notification_enabled?: boolean;

  @Column('boolean', { default: false })
    is_fs_on_notification_enabled?: boolean;

  @Column('boolean', { default: false })
    is_metering_hardware_online_notification_enabled?: boolean;

  @Column('boolean', { default: false })
    is_tariff_change_notification_enabled?: boolean;

  @Column('boolean', { default: false })
    is_upcoming_fs_control_rule_notification_enabled?: boolean;

  @Column('boolean', { default: false })
    is_fs_control_rule_change_notification_enabled?: boolean;

  @Column('boolean', { default: false })
    is_automatic_meter_install_enabled?: boolean;

  @Column('boolean', { default: false })
    is_automatic_payout_generation_enabled?: boolean;

  @Column('boolean', { default: false })
    is_automatic_energy_generation_data_sync_enabled?: boolean;

  @Column('boolean', { default: false })
    is_automatic_meter_energy_consumption_data_sync_enabled?: boolean;

  @Column('boolean', { default: false })
    is_dcu_connectivity_tracking_enabled?: boolean;

  @Column('boolean', { default: false })
    is_router_connectivity_tracking_enabled?: boolean;

  @Column('bool', { default: false })
    is_cabin_meter_credit_depleting?: boolean;

  /**
   * Telegram
  **/

  @Column('varchar', { nullable: true })
    telegram_response_path_token?: string;

  @Column('varchar', { nullable: true })
    telegram_notification_channel_invite_link?: string;

  @Column('varchar', { nullable: true })
    telegram_response_path_autopilot?: string;

  @Column('varchar', { nullable: true, unique: false })
    internal_telegram_group_chat_id?: string;

  @Column('varchar', { nullable: true, unique: false })
    internal_telegram_group_thread_id?: string;

  @Column('float', { nullable: false, unique: false })
    meter_commissioning_initial_credit_kwh;

  /**
   * Relations
  **/

  @Column('int')
    organization_id?: number;

  @ManyToOne(() => Organization, organization => organization.grids)
  @JoinColumn({ name: 'organization_id' })
    organization?: Organization;

  @OneToMany(() => Dcu, dcu => dcu.grid)
    dcus?: Dcu[];

  @OneToMany(() => Router, router => router.grid)
    routers?: Router[];

  @OneToMany(() => Agent, agent => agent.grid)
    agents?: Agent[];

  @OneToMany(() => Customer, customer => customer.grid)
    customers?: Customer[];

  @OneToMany(() => DirectiveBatch, directiveBatch => directiveBatch.grid)
    directive_batches?: DirectiveBatch[];

  @OneToMany(() => Member, member => member.busy_commissioning)
    being_commissioned_by?: Member[];

  @OneToMany(() => Mppt, mppt => mppt.grid)
    mptts?: Mppt[];

  // @OneToMany(() => Audit, audit => audit.grid)
  //   audits?: Audit[];

  @OneToMany(() => Pole, pole => pole.grid)
    poles?: Pole[];

  @OneToMany(() => Issue, issue => issue.grid)
    issues?: Issue[];

  @OneToMany(() => Payout, payout => payout.grid)
    payouts?: Payout[];

  @OneToMany(() => Notification, notification => notification.grid)
    notifications?: Notification[];

  @OneToMany(() => Order, order => order.historical_grid)
    historical_orders?: Order[];
}
