import { Controller, Post, UseGuards } from '@nestjs/common';
import { AuthenticationGuard } from '../auth/authentication.guard';
import { DirectiveBatchExecutionsService } from './directive-batch-executions.service';

@UseGuards(AuthenticationGuard)
@Controller('directive-batch-executions')
export class DirectiveBatchExecutionsController {
  constructor(protected readonly service: DirectiveBatchExecutionsService) {}

  @Post('reconcile-stale')
  async reconcileStale() {
    return this.service.doReconciliation();
  }
}
