import { Global, Module } from '@nestjs/common';
import { DirectiveBatchService } from './directive-batches.service';
import { DirectiveBatchesController } from './directive-batches.controller';

@Global()
@Module({
  providers: [ DirectiveBatchService ],
  controllers: [ DirectiveBatchesController ],
  exports: [ DirectiveBatchService ],
})
export class DirectiveBatchesModule { }
