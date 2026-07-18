import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { AuthenticationGuard } from '../auth/authentication.guard';

import { DataAnalyticsService } from '@tiamat/modules/data-analytics/data-analytics.service';

@UseGuards(AuthenticationGuard)
@Controller('data-analytics')
export class DataAnalyticsController {
  constructor(
    private readonly dataAnalyticsService: DataAnalyticsService,
  ) {}

  @Get('grid/:gridId/uptimes')
  getUptimes(
    @Param('gridId', ParseIntPipe) gridId: number,
  ) {
    return this.dataAnalyticsService.getGridUptimes(gridId);
  }

  @Post('grid/:gridId/top-consumers')
  getTopConsumers(
    @Param('gridId', ParseIntPipe) gridId: number,
    @Body() options,
  ) {
    return this.dataAnalyticsService.getGridTopConsumers(gridId, options);
  }
}
