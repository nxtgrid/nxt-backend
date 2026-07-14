import { Module } from '@nestjs/common';
import { demoModules, getConfig } from '@nxt/core';
import { HealthModule } from './health/health.module';

const alwaysOn = [ HealthModule ];

@Module({
  imports: [ ...alwaysOn, ...demoModules(getConfig()) ],
})
export class AppModule {}
