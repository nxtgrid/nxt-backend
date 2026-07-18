import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { MeterForNsDeregistration, MeterForNsRegistration } from '../../dto/meter-for-ns-registration.dto';

@Injectable()
export class CalinApiV1InstallService {
  constructor(
    public readonly httpService: HttpService,
  ) {}

  async registerOnNetworkServer({ external_reference, meter_phase, dcu_external_reference }: MeterForNsRegistration) {
    await this.httpService.axiosRef
      .post(`${ process.env.TALOS_API }/calin-v1/register-meter`, {
        external_reference,
        meter_phase,
        dcu_external_reference,
      });

    return { deferUntilAsynchronousCallback: true };
  }

  async deregisterOnNetworkServer({ external_reference }: MeterForNsDeregistration) {
    await this.httpService.axiosRef
      .delete(`${ process.env.TALOS_API }/calin-v1/deregister-meter/${ external_reference }`);

    return { deferUntilAsynchronousCallback: true };
  }
}
