// import { HttpService } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { PdFlowsController } from './pd-flows.controller';
import { PdFlowsService } from './pd-flows.service';

@Module({
  controllers: [ PdFlowsController ],
  providers: [ PdFlowsService ],
})
export class PdFlowsModule {
}
