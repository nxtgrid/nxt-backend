import { Global, Module } from '@nestjs/common';
import { JiraService } from './jira.service';
import { JiraController } from './jira.controller';

@Global()
@Module({
  providers: [ JiraService ],
  exports: [ JiraService ],
  controllers: [ JiraController ],
})
export class JiraModule {}
