import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { CoreTypeOrmModule, GlobalHttpModule, CoreLoggerModule, GlobalSupabaseModule, CorePgModule } from '@core';
import { TimeseriesTypeOrmModule } from '@timeseries';

// Core modules
import { CoreGridsModule } from '@core/modules/grids/grids.module';
import { CoreMetersModule } from '@core/modules/meters/meters.module';
import { CoreVictronModule } from '@core/modules/victron/victron.module';
import { CoreConnectionsModule } from '@core/modules/connections/connections.module';
import { CoreCustomersModule } from '@core/modules/customers/customers.module';
import { CoreDcusModule } from '@core/modules/dcus/dcus.module';
import { CoreIssuesModule } from '@core/modules/issues/issues.module';
import { CoreSpendingModule } from '@core/modules/spending/spending.module';
import { CoreEnergyTrackingModule } from '@core/modules/energy-tracking/energy-tracking.module';
import { SoftwareDevAlertModule } from '@core/modules/software-dev-alert/software-dev-alert.module';

// Local modules
import { CalinModule } from './calin/calin.module';
import { MpptsModule } from './mppts/mppts.module';
import { DcuSnapshot1MinModule } from './dcu-snapshot-1-min/dcu-snapshot-1-min.module';
import { GridEnergySnapshot15MinModule } from './grid-energy-snapshot-15-min/grid-energy-snapshot-15-min.module';
import { GridForecastSnapshot1HModule } from './grid-forecast-snapshot-1-h/grid-forecast-snapshot-1-h.module';
import { OrganizationSnapshot1DModule } from './organization-snapshot-1-d/organization-snapshot-1-d.module';
import { GridBusinessSnapshot1DModule } from './grid-business-snapshot-1-d/grid-business-snapshot-1-d.module';
import { MeterSnapshot1HModule } from './meter-snapshot-1-h/meter-snapshot-1-h.module';
import { SolcastModule } from './solcast/solcast.module';
import { MpptEnergySnapshot15MinModule } from './mppt-energy-snapshot-15-min/mppt-energy-snapshot-15-min.module';
import { MpptEstimatedActualSnapshot30MinModule } from './mppt-estimated-actual-snapshot-30-min/mppt-estimated-actual-snapshot-30-min.module';
import { GridDiagnosticsModule } from './grid-diagnostics/grid-diagnostics.module';
import { MpptAssetSnapshot1DModule } from './mppt-asset-snapshot-1-d/mppt-asset-snapshot-1-d.module';
import { ZerotierModule } from './zerotier/zerotier.module';
import { MpptForecastSnapshot30MinModule } from './mppt-forecast-snapshot-30-min/mppt-forecast-snapshot-30-min.module';
import { RoutersModule } from './routers/routers.module';
import { RouterSnapshot1MinModule } from './router-snapshot-1-min/router-snapshot-1-min.module';
import { GridDigitalTwinModule } from './grid-digital-twin/grid-digital-twin.module';
import { SolcastCacheModule } from './solcast-cache/solcast-cache.module';
import { ExchangeRateSnapshot1DModule } from './exchange-rate-snapshot-1-d/exchange-rate-snapshot-1-d.module';
import { ExchangeRatesModule } from './exchange-rates/exchange-rates.module';
import { DeviceDataSinkModule } from './device-data-sink/device-data-sink.module';
import { MeterConsumptionModule } from './meter-consumption/meter-consumption.module';

const modules = process.env.IS_HIBERNATED === 'true' ? [] : [
  ScheduleModule.forRoot(),
  CoreTypeOrmModule,
  TimeseriesTypeOrmModule,
  GlobalHttpModule,
  CoreLoggerModule,
  GlobalSupabaseModule,

  CoreGridsModule,
  CoreMetersModule,
  CoreVictronModule,
  CoreConnectionsModule,
  CoreCustomersModule,
  CoreDcusModule,
  CoreIssuesModule,
  RoutersModule,
  CoreSpendingModule,
  CoreEnergyTrackingModule,
  SolcastCacheModule,
  SoftwareDevAlertModule,
  CorePgModule,

  CalinModule,
  MpptsModule,
  ExchangeRatesModule,
  SolcastModule,
  ZerotierModule,
  DcuSnapshot1MinModule,
  GridEnergySnapshot15MinModule,
  GridBusinessSnapshot1DModule,
  OrganizationSnapshot1DModule,
  MpptEnergySnapshot15MinModule,
  MpptEstimatedActualSnapshot30MinModule,
  MpptForecastSnapshot30MinModule,
  RouterSnapshot1MinModule,
  MeterSnapshot1HModule,
  ExchangeRateSnapshot1DModule,
  GridDiagnosticsModule,
  MpptAssetSnapshot1DModule,
  GridForecastSnapshot1HModule,
  GridDigitalTwinModule,
  DeviceDataSinkModule,
  MeterConsumptionModule,
];

@Module({
  imports: modules,
})
export class AppModule { }
