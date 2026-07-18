import { Injectable } from '@nestjs/common';
import { NxtStsTokenService } from './adapters/nxt-sts/_token.service';
import { CalinApiV1TokenService } from './adapters/calin-api-v1/_token.service';
import { GenerateTokenDto } from './dto/generate-token.dto';
import { DeviceManufacturerEnum, DeviceProtocolEnum, NetworkServerImplementation } from './lib/types';
import { CalinApiV2TokenService } from './adapters/calin-api-v2/_token.service';

@Injectable()
export class DeviceTokenService {
  constructor(
    private readonly nxtStsTokenService: NxtStsTokenService,
    private readonly calinApiV1TokenService: CalinApiV1TokenService,
    private readonly calinApiV2TokenService: CalinApiV2TokenService,
  ) { }

  ROUTE_MAP = {
    CALIN_LORAWAN: this.nxtStsTokenService,
    CALIN_API_V1: this.calinApiV1TokenService,
    CALIN_API_V2: this.calinApiV2TokenService,
  };

  private getAdapter(manufacturer: DeviceManufacturerEnum, protocol: DeviceProtocolEnum) {
    if(!manufacturer || !protocol)
      throw new Error('Can\'t communicate with Network Server without manufacturer and protocol');
    const implementation = (manufacturer + '_' + protocol) as NetworkServerImplementation;
    const route = this.ROUTE_MAP[implementation];
    if(!route)
      throw new Error(`Can't find Token adapter for manufacturer ${ manufacturer } and protocol ${ protocol }.`);
    return route;
  }

  generate(generateTokenDto: GenerateTokenDto): Promise<string> {
    const _adapter = this.getAdapter(generateTokenDto.deviceData.manufacturer, generateTokenDto.deviceData.protocol);
    return _adapter.generate(generateTokenDto);
  }
};
