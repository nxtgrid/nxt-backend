import { Body, Controller, Post, Put } from '@nestjs/common';
import { IssuesService } from './issues.service';

// @SECURITY :: Add auth
@Controller('issues')
export class IssuesController {
  constructor(
    protected readonly issuesService: IssuesService,
  ) { }

  @Put()
  async update(
    @Body() body: any,
  ) {
    return this.issuesService.updateMany(body);
  }

  @Post('recalculate')
  async createIssues(
  ) {
    return this.issuesService.runMeterIssueCheck();
  }

  @Post('debug')
  async test(
    @Body() body: any,
  ) {
    return this.issuesService.setDebug(body.external_reference);
  }
}
