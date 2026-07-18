import { Global, Module } from '@nestjs/common';
import { DataAnalyticsService } from './data-analytics.service';
import { DataAnalyticsController } from './data-analytics.controller';

@Global()
@Module({
  providers: [ DataAnalyticsService ],
  exports: [ DataAnalyticsService ],
  controllers: [ DataAnalyticsController ],
})
export class DataAnalyticsModule { }
