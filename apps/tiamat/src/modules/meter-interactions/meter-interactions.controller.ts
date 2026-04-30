import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { AuthenticationGuard } from '../auth/authentication.guard';
import { MeterInteractionsService } from './meter-interactions.service';
import { CurrentUser, NxtSupabaseUser } from '../auth/nxt-supabase-user';
import { ApiCreateMeterInteractionDto } from './dto/create-meter-interaction.dto';

@UseGuards(AuthenticationGuard)
@Controller('meter-interactions')
export class MeterInteractionsController {
  constructor(private readonly service: MeterInteractionsService) {}

  @Post('create-one')
  createOne(
    @Body() body: ApiCreateMeterInteractionDto,
    @CurrentUser() user: NxtSupabaseUser,
  ) {
    return this.service.createOneFromApi(body, user);
  }

  @Post('retry')
  retryOne(
    @Body() { id }: { id: number },
    @CurrentUser() user: NxtSupabaseUser,
  ) {
    return this.service.retryOne(id, user);
  }

  @Post('reconcile-suspended')
  reconcileSuspended() {
    return this.service.reconcileSuspendedInteractions();
  }

  /**
   * Get the delivery status of a meter interaction.
   * Returns the current position in the delivery pipeline if the message
   * is still being delivered, or isDelivering: false if completed/failed.
   *
   * @param id - The meter interaction ID
   */
  @Get(':id/delivery-status')
  getDeliveryStatus(@Param('id', ParseIntPipe) id: number) {
    return this.service.getDeliveryStatus(id);
  }
}
