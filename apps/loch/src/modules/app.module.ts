import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { CoreTypeOrmModule, GlobalHttpModule, CoreLoggerModule, GlobalSupabaseModule, CorePgModule } from '@core';
import { TimeseriesTypeOrmModule } from '@timeseries';

// Core modules
import { CoreGridsModule } from '@core/modules/grids/grids.module';
import { SoftwareDevAlertModule } from '@core/modules/software-dev-alert/software-dev-alert.module';
import { CoreVictronModule } from '@core/modules/victron/victron.module';
import { CoreIssuesModule } from '@core/modules/issues/issues.module';
import { CoreConnectionsModule } from '@core/modules/connections/connections.module';
import { CoreCustomersModule } from '@core/modules/customers/customers.module';
import { CoreSpendingModule } from '@core/modules/spending/spending.module';

// Local modules
import { AgentsModule } from './agents/agents.module';
import { EpicollectModule } from './epicollect/epicollect.module';
import { AutopilotModule } from './autopilot/autopilot.module';
import { SunriseSunsetModule } from './sunrise-sunset/sunrise-sunset.module';
import { MqttModule } from './mqtt/mqtt.module';
import { MongoAtlasModule } from './mongo-atlas/mongo-atlas.module';
import { NotificationsModule } from './notifications/notifications.module';
import { RevenueUpdateModule } from './revenue-update/revenue-update.module';
import { NotificationParametersModule } from './notification-parameters/notification-parameters.module';
import { SendgridModule } from './sendgrid/sendgrid.module';
import { TelegramModule } from './telegram/telegram.module';
import { PayoutsModule } from './payouts/payouts.module';
import { AfricastalkingModule } from './africastalking/africastalking.module';
import { WeatherModule } from './weather/weather.module';
import { LifelineModule } from './lifeline/lifeline.module';
import { PdHeroModule } from './pd-hero/pd-hero.module';
import { MakeModule } from './make/make.module';

const modules = process.env.IS_HIBERNATED === 'true' ? [] : [
  ScheduleModule.forRoot(),
  CoreTypeOrmModule,
  TimeseriesTypeOrmModule,
  GlobalHttpModule,
  CoreLoggerModule,
  GlobalSupabaseModule,
  CorePgModule,

  CoreGridsModule,
  SoftwareDevAlertModule,
  CoreVictronModule,
  CoreIssuesModule,
  AgentsModule,
  CoreConnectionsModule,
  CoreCustomersModule,
  CoreSpendingModule,
  PdHeroModule,
  MakeModule,

  EpicollectModule,
  AutopilotModule,
  SunriseSunsetModule,
  MqttModule,
  MongoAtlasModule,
  NotificationsModule,
  SendgridModule,
  RevenueUpdateModule,
  TelegramModule,
  NotificationParametersModule,
  PayoutsModule,
  AfricastalkingModule,
  WeatherModule,
  LifelineModule,
];

@Module({
  imports: modules,
})
export class AppModule { }
