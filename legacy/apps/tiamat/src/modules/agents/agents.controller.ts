import { Controller, /* Get, Param, */ UseGuards } from '@nestjs/common';
import { AuthenticationGuard } from '../auth/authentication.guard';
import { AgentsService } from '@core/modules/agents/agents.service';

@UseGuards(AuthenticationGuard)
@Controller('agents')
export class AgentsController {
  constructor(
    private readonly agentsService: AgentsService,
  ) { }

  // This is used by Flow XO to look for agents
  // @TODO :: deprecate entire controller
  // @Get(':id')
  // getAgent(@Param('id') id) {
  //   counter++;
  //   console.info(`[/AGENTS/:ID] agents/:id was called ${ counter } times`);
  //   return this.agentsService.findByIdOrTelgramId(id);
  // }
}
