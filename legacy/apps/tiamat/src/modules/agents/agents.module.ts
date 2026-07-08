import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agent } from '@core/modules/agents/entities/agent.entity';
import { AgentsService } from '@core/modules/agents/agents.service';
import { AgentsController } from './agents.controller';

@Global()
@Module({
  imports: [ TypeOrmModule.forFeature([ Agent ]) ],
  providers: [ AgentsService ],
  exports: [ AgentsService ],
  controllers: [ AgentsController ],
})
export class AgentsModule { }
