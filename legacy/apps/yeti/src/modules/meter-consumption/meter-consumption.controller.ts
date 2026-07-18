import { Controller, Get, Logger, Query, BadRequestException, UseGuards } from '@nestjs/common';
import { MeterConsumptionService } from './meter-consumption.service';
import { ApiKeyGuard } from './api-key.guard';

@Controller('meter-consumption')
@UseGuards(ApiKeyGuard)
export class MeterConsumptionController {
  private readonly logger = new Logger(MeterConsumptionController.name);

  constructor(private readonly meterConsumptionService: MeterConsumptionService) { }

  @Get()
  async getConsumption(
    @Query('FROM') from: string,
    @Query('TO') to: string,
    @Query('site') site?: string,
    @Query('site_id') siteIdRaw?: string,
    @Query('offset') offset?: string,
  ) {
    if (!from || !to) throw new BadRequestException('Missing required parameters: FROM, TO');

    const siteId = siteIdRaw ? this.parseSiteId(siteIdRaw) : undefined;
    if (!siteId && !site) {
      this.logger.warn('Request received without site or site_id parameter — integration is misconfigured');
      throw new BadRequestException('Missing required parameter: site or site_id');
    }

    const siteLabel = siteId ? `site_id=${ siteId }` : `site=${ site }`;

    const result = await this.meterConsumptionService.getConsumption({
      from,
      to,
      site,
      siteId,
      offset: offset ? this.parseOffset(offset) : undefined,
    });

    console.info(`[METER CONSUMPTION] ${ siteLabel } FROM=${ from } TO=${ to } offset=${ result.offset } pageLimit=${ result.pageLimit } total=${ result.total } returned=${ result.readings.length }`);
    if (result.readings.length < result.pageLimit) {
      console.info(`[METER CONSUMPTION] ======== ${ siteLabel } ${ from.slice(0, 10) } complete ========`);
    }

    return result;
  }

  private parseSiteId(value: string): number {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed <= 0) throw new BadRequestException('Invalid site_id parameter');
    return parsed;
  }

  private parseOffset(value: string): number {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < 0) throw new BadRequestException('Invalid offset parameter');
    return parsed;
  }
}
