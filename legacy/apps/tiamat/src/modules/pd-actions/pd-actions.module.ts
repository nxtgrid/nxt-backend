import { Module } from '@nestjs/common';
import { PdActionsController } from './pd-actions.controller';
import { PdActionsService } from './pd-actions.service';

@Module({
  controllers: [ PdActionsController ],
  providers: [ PdActionsService ],
})
export class PdActionsModule {}
