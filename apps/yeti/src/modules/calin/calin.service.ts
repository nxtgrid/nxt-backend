import { Injectable } from '@nestjs/common';
import { partition } from 'ramda';

import { Meter } from '@core/modules/meters/entities/meter.entity';
import { MeterSnapshot1H } from '@timeseries/entities/meter-snapshot-1-h.entity';

import { CalinV1Service } from './implementations/calinv1.service';
import { Calinv2Service } from './implementations/calinv2.service';
import { CalinLorawanService } from './implementations/calin-lorawan.service';

import { CalinConcentrator } from '../dcu-snapshot-1-min/dto/calin-concentrator';

@Injectable()
export class CalinService {
  constructor(
    protected readonly calinV1Service: CalinV1Service,
    protected readonly calinV2Service: Calinv2Service,
    protected readonly calinLorawanService: CalinLorawanService,
  ) {}

  // We do not take into account Lorawan meters here, since they rely on a push mechanism to upload consumption information
  async getConsumptionDataByMetersAndDate(meters: Meter[], date: moment.Moment): Promise<MeterSnapshot1H[]> {
    const [ v1, nonV1 ] = partition(meter => meter.communication_protocol === 'CALIN_V1', meters);
    const v2 = nonV1.filter(meter => meter.communication_protocol === 'CALIN_V2');
    const v1Result: MeterSnapshot1H[] = await this.calinV1Service.getConsumptionDataByMetersAndDate(v1, date);
    const v2Result: MeterSnapshot1H[] = await this.calinV2Service.getConsumptionDataByMetersAndDate(v2, date);

    return [ ...v1Result, ...v2Result ];
  }

  async getConcentrators(): Promise<CalinConcentrator[]> {
    // We need to query both platforms
    const v1 = await this.calinV1Service.getConcentrators();
    const v2 = await this.calinV2Service.getConcentrators();
    const lorawan = await this.calinLorawanService.getConcentrators();
    return [ ...v1, ...v2, ...lorawan ];
  }
}
