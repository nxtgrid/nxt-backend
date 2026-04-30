import { Global, Module } from '@nestjs/common';
import { DeviceMessageOutgoingService } from './outgoing.service';
import { DeviceMessageIncomingService } from './incoming.service';
import { DeviceTokenService } from './token.service';

// Adapters
import { NxtStsTokenService } from './adapters/nxt-sts/_token.service';
import { CalinLorawanOutgoingService } from './adapters/calin-lorawan/_outgoing.service';
import { CalinLorawanIncomingService } from './adapters/calin-lorawan/_incoming.service';
import { CalinApiV1TokenService } from './adapters/calin-api-v1/_token.service';
import { CalinApiV1OutgoingService } from './adapters/calin-api-v1/_outgoing.service';
import { CalinApiV1IncomingService } from './adapters/calin-api-v1/_incoming.service';
import { CalinApiV2TokenService } from './adapters/calin-api-v2/_token.service';
import { CalinApiV2OutgoingService } from './adapters/calin-api-v2/_outgoing.service';
import { CalinApiV2IncomingService } from './adapters/calin-api-v2/_incoming.service';


@Global()
@Module({
  providers: [
    DeviceMessageOutgoingService,
    DeviceMessageIncomingService,
    DeviceTokenService,

    NxtStsTokenService,
    CalinLorawanOutgoingService,
    CalinLorawanIncomingService,
    CalinApiV1TokenService,
    CalinApiV1OutgoingService,
    CalinApiV1IncomingService,
    CalinApiV2TokenService,
    CalinApiV2OutgoingService,
    CalinApiV2IncomingService,
  ],
  exports: [ DeviceTokenService, DeviceMessageIncomingService, DeviceMessageOutgoingService ],
})
export class DeviceMessagesModule { }
