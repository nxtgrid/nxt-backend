import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentsService } from '@core/modules/agents/agents.service';
import { Agent } from '@core/modules/agents/entities/agent.entity';

@Global()
@Module({
  imports: [ TypeOrmModule.forFeature([ Agent ]) ],
  providers: [ AgentsService ],
  exports: [ AgentsService ],
})
export class AgentsModule { }
