import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthenticationGuard } from '../auth/authentication.guard';
import { ChirpStackService } from './chirpstack.service';
import { DeviceMessageIncomingService } from '../device-messages/incoming.service';
import { LorawanCalinEvent } from '../device-messages/adapters/calin-lorawan/lib/types';

@UseGuards(AuthenticationGuard)
@Controller('chirpstack')
export class ChirpstackController {
  constructor(
    private readonly chirpstackService: ChirpStackService,
    private readonly deviceMessageIncomingService: DeviceMessageIncomingService,
  ) { }

  // Webhook used by ChirpStack to report messages being upped/downed
  @Post('calin')
  calinIncoming(@Body() body: LorawanCalinEvent) {
    return this.deviceMessageIncomingService.handle(body, 'CALIN_LORAWAN');
  }

  // Receives data from Acrel meters in ChirpStack.
  @Post('acrel')
  acrel(
    @Body() body: any,
  ) {
    return this.chirpstackService.processIncomingLorawanMessageForAcrelProfile(body);
  }

  // Receives data from Acrel meters in ChirpStack.
  @Post('milesight')
  milesight(
    @Body() body: any,
  ) {
    return this.chirpstackService.processIncomingLorawanMessageForMilesightProfile(body);
  }
}
