import { Body, Controller, Get, Post } from '@nestjs/common';
import { EpicollectService } from './epicollect.service';

@Controller('epicollect')
export class EpicollectController {
  constructor(protected readonly epicollectService: EpicollectService) {}

  @Post('sync-one-survey')
  async syncOneSurvey(@Body() { organization_id, uuid }): Promise<any> {
    return this.epicollectService.importSingleSurvey(organization_id, uuid);
  }

  @Post('sync-one-organization')
  async syncOneOrganization(@Body() { id }): Promise<any> {
    return this.epicollectService.importSurveysForSingleOrganization(id);
  }

  @Get('sync')
  async sync(): Promise<any> {
    this.epicollectService.importSurveys();
    return { 'response': 'Sync process initialised' };
  }

  @Get('check-discrepancies')
  async checkDiscrepancies(): Promise<any> {
    this.epicollectService.checkDiscrepancies();
    return { 'response': 'Checking discrepancies' };
  }
}
