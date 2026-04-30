import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { PdFlowsService } from './pd-flows.service';
import { CreatePdFlowDto } from './dto/create-pd-flow.dto';
import { AuthenticationGuard } from '../auth/authentication.guard';
import { CurrentUser } from '../auth/nxt-supabase-user';

@UseGuards(AuthenticationGuard)
@Controller('pd-flows')
export class PdFlowsController {
  constructor(private readonly pdFlowsService: PdFlowsService) { }

  @Post()
  create(
    @CurrentUser() author,
    @Body() pdFlow: CreatePdFlowDto,
  ) {
    return this.pdFlowsService.create(pdFlow, author);
  }
}
