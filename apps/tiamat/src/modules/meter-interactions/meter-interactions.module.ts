import { Global, Module } from '@nestjs/common';
import { MeterInteractionsController } from './meter-interactions.controller';
import { MeterInteractionsService } from './meter-interactions.service';
import { InteractionAfterEffectsService } from './interaction-after-effects.service';
import { InteractionGatekeeperService } from './interaction-gatekeeper.service';
import { GridDigitalTwinService } from './grid-digital-twin.service';

@Global()
@Module({
  providers: [ MeterInteractionsService, InteractionGatekeeperService, InteractionAfterEffectsService, GridDigitalTwinService ],
  exports: [ MeterInteractionsService ],
  controllers: [ MeterInteractionsController ],
})
export class MeterInteractionsModule {}
