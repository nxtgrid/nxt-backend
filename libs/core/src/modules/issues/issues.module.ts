import { Global, Module } from '@nestjs/common';
import { IssuesService } from './issues.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Issue } from './entities/issue.entity';

@Global()
@Module({
  imports: [ TypeOrmModule.forFeature([ Issue ]) ],
  providers: [ IssuesService ],
  exports: [ IssuesService ],
})
export class CoreIssuesModule { }
