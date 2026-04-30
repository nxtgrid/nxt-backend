import { Global, Module } from '@nestjs/common';
import { IssuesService } from './issues.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Issue } from '@core/modules/issues/entities/issue.entity';
import { IssuesController } from './issues.controller';

@Global()
@Module({
  imports: [ TypeOrmModule.forFeature([ Issue ]) ],
  providers: [ IssuesService ],
  exports: [ IssuesService ],
  controllers: [ IssuesController ],
})
export class IssuesModule { }
