import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import { DirectiveBatchService } from './directive-batches.service';
import { CurrentUser, NxtSupabaseUser } from '../auth/nxt-supabase-user';
import { AuthenticationGuard } from '../auth/authentication.guard';
import { UpsertDirectiveBatchDto } from './dto/UpsertDirectiveBatchDto';

@UseGuards(AuthenticationGuard)
@Controller('directive-batches')
export class DirectiveBatchesController {
  constructor(protected readonly service: DirectiveBatchService) {}

  @Post('upsert-many')
  async upsertDirectiveBatches(
    @CurrentUser() user: NxtSupabaseUser,
    @Body() body: UpsertDirectiveBatchDto[],
  ) {
    return this.service.upsertMany(body, user);
  }
}
