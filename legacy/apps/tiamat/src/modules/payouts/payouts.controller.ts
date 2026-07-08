import { Body, Controller, Post, Put, UseGuards } from '@nestjs/common';
import { PayoutsService } from './payouts.service';
import { UpdatePayoutInput } from '@core/modules/payouts/dto/update-payout.input';
import { GeneratePayoutDto } from '@core/modules/payouts/dto/generate-payout.dto';
import { AuthenticationGuard } from '../auth/authentication.guard';

@UseGuards(AuthenticationGuard)
@Controller('payouts')
export class PayoutsController {
  constructor(
    protected readonly service: PayoutsService,
  ) { }

  // Called by Make to update the id of the draft_link.
  @Put()
  update(
    @Body() body: UpdatePayoutInput,
  ) {
    return this.service.update(body.id, body);
  }

  // Called by loch to generate a payout
  @Post()
  generate(
    @Body() body: GeneratePayoutDto,
  ) {
    return this.service.generate(body);
  }
}
