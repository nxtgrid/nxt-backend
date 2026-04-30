import { Body, Controller, Post } from '@nestjs/common';
import { MeterSnapshot1HService } from './meter-snapshot-1-h.service';

// security: add auth
@Controller('meter-snapshot-1-h')
export class MeterSnapshot1HController {
  constructor(private readonly meterSnapshot1HService: MeterSnapshot1HService) { }

  @Post('hourly-report')
  create(
    @Body() body: any) {
    return this.meterSnapshot1HService.insertHourlyReadReport(body);
  }
}
