import { Controller } from '@nestjs/common';
// import { JiraService } from './jira.service';
// import { IssuesService } from '@tiamat/modules/issues/issues.service';

// todo: add security
@Controller('jira')
export class JiraController {
  constructor(
    // private readonly issuesService: IssuesService,
    // protected readonly jiraService: JiraService,
  ) { }

  // todo: uncomment when need to add update webhook functionality from jira
  //  @Post('comments')
  // async update(
  //   @Body() body: any) {
  //   // console.info(body);
  //   // return this.jiraService.updateLocal(body);
  //   return {};
  // }

  // this is just for testing, since simulating the creation of an issue
  // is hard
  // @Get('create/test')
  // async testIssueCreation() {
  //   const latestIssue = await this.issuesService.findOne(70538);
  //   await this.jiraService.createMany([ latestIssue ]);
  // }

  // this is just for testing, since simulating the creation of an issue
  // is hard
  // @Get('comment/test')
  // async testIssueComment() {
  //   const latestIssue = await this.issuesService.findOne(72336);
  //   await this.jiraService.comment(latestIssue, 'this is a comment');
  // }
}
