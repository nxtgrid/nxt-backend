import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { CoreTypeOrmModule, GlobalHttpModule, CoreLoggerModule, GlobalSupabaseModule, CorePgModule } from '@core';
import { TimeseriesTypeOrmModule } from '@timeseries';

// Core modules
import { CoreSpendingModule } from '@core/modules/spending/spending.module';
import { CoreEnergyTrackingModule } from '@core/modules/energy-tracking/energy-tracking.module';
import { SoftwareDevAlertModule } from '@core/modules/software-dev-alert/software-dev-alert.module';

// Local modules
import { UserAdminModule } from './user-admin/user-admin.module';
import { AccountsModule } from './accounts/accounts.module';
import { AfricastalkingModule } from './africastalking/africastalking.module';
import { AgentsModule } from './agents/agents.module';
import { AuthModule } from './auth/auth.module';
import { ConnectionsModule } from './connections/connections.module';
import { DcusModule } from './dcus/dcus.module';
import { FlutterwaveModule } from './flutterwave/flutterwave.module';
import { GridsModule } from './grids/grids.module';
import { MetersModule } from './meters/meters.module';
import { MpptsModule } from './mppts/mppts.module';
import { OrdersModule } from './orders/orders.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { DirectiveBatchesModule } from './directive-batches/directive-batches.module';
import { DirectiveBatchExecutionsModule } from './directive-batch-executions/directive-batch-executions.module';
import { UssdSessionsModule } from './ussd-sessions/ussd-sessions.module';
import { WalletsModule } from './wallets/wallets.module';
import { WebsocketModule } from './websocket/websocket.module';
import { DownloadModule } from './download/download.module';
import { CoreVictronModule } from '@core/modules/victron/victron.module';
import { MeteringHardwareInstallSessionsModule } from './metering-hardware-install-sessions/metering-hardware-install-sessions.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { TelegramModule } from './telegram/telegram.module';
import { IssuesModule } from './issues/issues.module';
import { EpicollectModule } from './epicollect/epicollect.module';
import { JiraModule } from './jira/jira.module';
import { PayoutsModule } from './payouts/payouts.module';
import { NotificationsModule } from './notifications/notifications.module';
import { LostRevenueModule } from './lost-revenue/lost-revenue.module';
import { SendgridModule } from './sendgrid/sendgrid.module';
import { PdFlowsModule } from './pd-flows/pd-flows.module';
import { PdActionsModule } from './pd-actions/pd-actions.module';
import { ChirpstackModule } from './chirpstack/chirpstack.module';
import { DeviceMessagesModule } from './device-messages/device-messages.module';
import { MeterInteractionsModule } from './meter-interactions/meter-interactions.module';
import { MeterInstallsModule } from './meter-installs/meter-installs.module';
import { DataAnalyticsModule } from './data-analytics/data-analytics.module';
import { AutopilotModule } from './autopilot/autopilot.module';

const modules = process.env.IS_HIBERNATED === 'true' ? [] : [
  ScheduleModule.forRoot(),
  CoreTypeOrmModule,
  TimeseriesTypeOrmModule,
  GlobalHttpModule,
  GlobalSupabaseModule,
  CorePgModule,
  CoreLoggerModule,

  CoreEnergyTrackingModule,
  CoreSpendingModule,
  SoftwareDevAlertModule,
  DeviceMessagesModule,
  MeterInteractionsModule,
  MeterInstallsModule,
  DataAnalyticsModule,
  UserAdminModule,
  AccountsModule,
  AgentsModule,
  AuthModule,
  DcusModule,
  CoreVictronModule,
  MeteringHardwareInstallSessionsModule,
  OrganizationsModule,
  FlutterwaveModule,
  GridsModule,
  MetersModule,
  OrdersModule,
  DirectiveBatchesModule,
  DirectiveBatchExecutionsModule,
  UssdSessionsModule,
  WalletsModule,
  AfricastalkingModule,
  ConnectionsModule,
  DownloadModule,
  MpptsModule,
  WebsocketModule,
  IssuesModule,
  ApiKeysModule,
  TelegramModule,
  EpicollectModule,
  JiraModule,
  PayoutsModule,
  NotificationsModule,
  LostRevenueModule,
  SendgridModule,
  PdFlowsModule,
  PdActionsModule,
  ChirpstackModule,
  AutopilotModule,
];

@Module({ imports: modules })
export class AppModule { }
