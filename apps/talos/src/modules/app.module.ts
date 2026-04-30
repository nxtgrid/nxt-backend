import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { CoreTypeOrmModule, GlobalHttpModule, CoreLoggerModule, GlobalSupabaseModule } from '@core';

// Core modules
import { CoreMetersModule } from '@core/modules/meters/meters.module';
import { SoftwareDevAlertModule } from '@core/modules/software-dev-alert/software-dev-alert.module';

// Local modules
import { CalinV1Module } from './calin-v1/calin-v1.module';
import { CalinModule } from './calin/calin.module';
import { MeteringHardwareImportsModule } from './metering-hardware-imports/metering-hardware-imports.module';
import { DebugController } from './debug/debug.controller';

const modules = process.env.IS_HIBERNATED === 'true' ? [] : [
  ScheduleModule.forRoot(),
  CoreTypeOrmModule,
  GlobalHttpModule,
  CoreLoggerModule,
  GlobalSupabaseModule,

  CalinV1Module,

  CoreMetersModule,
  CalinModule,
  MeteringHardwareImportsModule,
  SoftwareDevAlertModule,
];

@Module({
  imports: modules,
  controllers: [ DebugController ],
})
export class AppModule { }
