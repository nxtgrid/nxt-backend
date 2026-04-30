import { Injectable } from '@nestjs/common';
import { MeterForNsDeregistration, MeterForNsRegistration } from '../../dto/meter-for-ns-registration.dto';
import { CalinApiV2CreateTaskResponse, CalinApiV2Error, CalinApiV2TaskDataResponse, sendCalinApiV2Request } from '@tiamat/modules/device-messages/adapters/calin-api-v2/lib/repo';

const { CALIN_V2_CUSTOMER_ID, CALIN_V2_COMPANY_NAME } = process.env;

@Injectable()
export class CalinApiV2InstallService {

  async registerOnNetworkServer(_dto: MeterForNsRegistration) {
    // @TODO :: Implement
    return { deferUntilAsynchronousCallback: false };
  }

  async deregisterOnNetworkServer({ external_reference, dcu_external_reference }: MeterForNsDeregistration) {
    const pn = await this.getPn(external_reference, dcu_external_reference);
    await this.unassignMeterFromDcu(dcu_external_reference, pn);
    await this.synchronizeDcu(dcu_external_reference);
    await this.deleteMeterFromPlatform(external_reference);

    return { deferUntilAsynchronousCallback: false };
  }


  /**
   * Registration helpers
  **/

  private async synchronizeDcu(ConcentratorId: string) {
    const { result } = await sendCalinApiV2Request<CalinApiV2CreateTaskResponse>(
      '/api/concentrator/updateStatusFile',
      {
        Company: process.env.CALIN_V2_COMPANY_NAME,
        ConcentratorId,
      },
    );

    const task = result?.[0];
    if (!task) throw new CalinApiV2Error('No good answer for DCU sync');
    return task;
  }


  /**
   * Deregistration helpers
  **/

  private async getPn(external_reference: string, dcu_external_reference: string) {
    const { result } = await sendCalinApiV2Request<CalinApiV2TaskDataResponse>(
      '/API/ConcentratorFile/Read',
      {
        meterId: external_reference,
        concentratorId: dcu_external_reference,
        company: CALIN_V2_COMPANY_NAME,
      },
    );

    const pn = result?.data?.[0]?.pn;
    if(!pn) throw new CalinApiV2Error('No good answer when getting meter pn');
    console.info(`
      ###################################################################
                                  PN
      ###################################################################
    `, pn, typeof pn);
    return Number(pn);
  }

  private async unassignMeterFromDcu(concentratorId: string, pn: number) {
    const { result } = await sendCalinApiV2Request<CalinApiV2CreateTaskResponse>(
      '/api/concentratorFile/delete',
      [ {
        pn,
        concentratorId,
        company: CALIN_V2_COMPANY_NAME,
      } ],
    );

    const task = result?.[0];
    if(!task) throw new CalinApiV2Error('No good answer when unassigning meter from DCU');
    return task;
  }

  private async deleteMeterFromPlatform(meterId: string) {
    const { result } = await sendCalinApiV2Request<CalinApiV2CreateTaskResponse>(
      '/api/account/delete',
      [ {
        meterId,
        customerId: CALIN_V2_CUSTOMER_ID,
        Company: CALIN_V2_COMPANY_NAME,
      } ],
    );

    const task = result?.[0];
    if(!task) throw new CalinApiV2Error('No good answer for meter deletion');
    return task;
  }
}
