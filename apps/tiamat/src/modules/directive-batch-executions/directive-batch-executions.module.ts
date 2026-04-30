import { Global, Module } from '@nestjs/common';
import { DirectiveBatchExecutionsService } from './directive-batch-executions.service';
import { DirectiveBatchExecutionsController } from './directive-batch-executions.controller';

@Global()
@Module({
  providers: [ DirectiveBatchExecutionsService ],
  controllers: [ DirectiveBatchExecutionsController ],
  exports: [ DirectiveBatchExecutionsService ],
})
export class DirectiveBatchExecutionsModule { }
