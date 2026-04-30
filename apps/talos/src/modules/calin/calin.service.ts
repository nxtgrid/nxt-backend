import { Injectable } from '@nestjs/common';
import { Meter } from '@core/modules/meters/entities/meter.entity';
import { CommunicationProtocolEnum } from '@core/types/supabase-types';
import { DcuForInstallDto } from './dto/dcu-for-install.dto';

import { CalinV1Service } from './implementations/calinv1.service';
import { Calinv2Service } from './implementations/calinv2.service';

@Injectable()
export class CalinService {
  constructor(
    private readonly calinV1Service: CalinV1Service,
    private readonly calinV2Service: Calinv2Service,
  ) {}

  routeMap = {
    CALIN_V1: this.calinV1Service,
    CALIN_V2: this.calinV2Service,
  };

  getService(protocol: CommunicationProtocolEnum) {
    if(!protocol)
      throw new Error('Can\'t communicate with Calin without knowing the protocol (specified on DCU');
    const route = this.routeMap[protocol];
    if(!route)
      throw new Error(`Can't find Calin service implementation for communication protocol ${ protocol }`);
    return route;
  }

  importMeter(meter: Meter) {
    console.info('[IMPORT METER] Going to import meter', meter);
    return this.getService(meter.communication_protocol).importMeter(meter);
  }

  removeMeter(meter: Meter) {
    // @TODO :: Do proper meter uninstalls
    if(meter.communication_protocol === 'CALIN_LORAWAN') return 'meter';
    return this.getService(meter.communication_protocol).removeMeter(meter);
  }

  importDcu(dcu: DcuForInstallDto) {
    return this.getService(dcu.communication_protocol).importDcu(dcu);
  }

  removeDcu(dcu: DcuForInstallDto) {
    return this.getService(dcu.communication_protocol).removeDcu(dcu);
  }
}
