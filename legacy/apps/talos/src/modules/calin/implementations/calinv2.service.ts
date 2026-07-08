import { Injectable } from '@nestjs/common';
import { CalinService } from '@core/modules/calin/calin.service';
import { Dcu } from '@core/modules/dcus/entities/dcu.entity';
import { Meter } from '@core/modules/meters/entities/meter.entity';
import { DcuForInstallDto } from '../dto/dcu-for-install.dto';

@Injectable()
export class Calinv2Service extends CalinService {
  sendRequest = this.createApiConnection('CALIN_V2').sendRequest;

  async createMeter(meter: Meter) {
    const { result } = await this.sendRequest({
      path: '/api/account/create',
      body: [ {
        meterId: meter.external_reference,
        company: process.env.CALIN_V2_COMPANY_NAME,
        customerId: process.env.CALIN_V2_CUSTOMER_ID,
        region: 'Nigeria',
        remark: null,
        tariffId: '1',
      } ],
    });
    console.info('[STEP 1: CREATE METER V2] Result:', result);

    const task = result?.[0];
    if(!task) throw new Error('No good answer for meter creation');
    return task;
  }

  async assignMeterToDcu(meter: Meter) {
    const { result } = await this.sendRequest({
      path: '/api/concentratorFile/create',
      body: [
        {
          communicationPort: 31,
          concentratorId: meter.dcu.external_reference,
          meterId: meter.external_reference,
          safetyLevel: 1,//not sure about this
          encryptionMode: 0,//not sure about this
          protocolType: 3,//not sure about this
          concentratorMeterType: 1,//not sure about this
          clientAddress: 71,//not sure about this
          password: '<factory-default>', //not sure about this
          relayAddress: '000000000000',//not sure about this
          communicationParameter: '9600-n-8-1',
          pn: 0,
          company: process.env.CALIN_V2_COMPANY_NAME,
        },
      ],
    });

    console.info('[STEP 2: ASSIGN METER TO DCU V2] Result:', result);

    const task = result?.[0];
    if (!task) throw new Error('No good answer when assigning meter to DCU');
    return task;
  }

  async synchronizeDcu(dcu: Dcu) {
    const { result } = await this.sendRequest({
      path: '/api/concentrator/updateStatusFile',
      body: {
        Company: process.env.CALIN_V2_COMPANY_NAME,
        ConcentratorId: dcu.external_reference,
      },
    });

    console.info('[STEP 3: SYNC DCU V2] Result:', result);

    const task = result?.[0];
    if (!task) throw new Error('No good answer for DCU sync');
    return task;
  }

  async importMeter(meter: Meter) {
    console.info('[IMPORT METER V2] Going to import meter', meter);
    // 1.) Add the meter to Calin
    await this.createMeter(meter);

    // 2.) Assign that meter to a DCU
    await this.assignMeterToDcu(meter);

    // 3.) Synchronize the DCU 'file'
    return this.synchronizeDcu(meter.dcu);
  }

  async unassignMeterFromDcu(meter: Meter, pn: number) {
    const { result } = await this.sendRequest({
      path: '/api/concentratorFile/delete',
      body: [
        {
          pn: Number(pn),
          company: process.env.CALIN_V2_COMPANY_NAME,
          concentratorId: meter.dcu.external_reference,
        },
      ],
    });

    const task = result?.[0];
    if(!task) throw new Error('No good answer for meter unassignment');
    return task;
  }

  async deleteMeterFromPlatform(meter: Meter) {
    const { result } = await this.sendRequest({
      path: '/api/account/delete',
      body: [
        {
          customerId: process.env.CALIN_V2_CUSTOMER_ID,
          meterId: meter.external_reference,
          Company: process.env.CALIN_V2_COMPANY_NAME,
        },
      ],
    });

    const task = result?.[0];
    if(!task) throw new Error('No good answer for meter deletion');
    return task;
  }

  async getPn(meter: Meter) {
    const { result } = await this.sendRequest({
      path: '/API/ConcentratorFile/Read',
      body: {
        concentratorId: meter.dcu.external_reference,
        meterId: meter.external_reference,
        company: process.env.CALIN_V2_COMPANY_NAME,
      },
    });

    const pn = result?.data?.[0]?.pn;
    if(!pn) throw new Error('No good answer when getting meter pn');
    return pn;
  }

  async removeMeter(meter: Meter) {
    const pn = await this.getPn(meter);
    await this.unassignMeterFromDcu(meter, pn);
    await this.synchronizeDcu(meter.dcu);
    return this.deleteMeterFromPlatform(meter);
  }

  async importDcu(dcu: DcuForInstallDto) {
    const { result } = await this.sendRequest({
      path: '/API/Concentrator/Create',
      body: [
        {
          concentratorId: dcu.external_reference,
          name: `(${ dcu.external_reference }) Installed by talos`, //todo: no idea
          lat: 0, //todo: no idea
          lng: 0, //todo: no idea
          remark: null, //todo: no idea
          company: process.env.CALIN_V2_COMPANY_NAME,
        },
      ],
    });

    const task = result?.[0];
    if(!task) throw new Error('No good answer for DCU creation');
    return task;
  }

  async removeDcu(dcu: DcuForInstallDto) {
    const { result } = await this.sendRequest({
      path: '/API/Concentrator/Delete',
      body: [
        {
          concentratorId: dcu.external_reference,
          Company: process.env.CALIN_V2_COMPANY_NAME,
        },
      ],
    });

    const task = result?.[0];
    if(!task) throw new Error('No good answer for DCU removal');
    return task;
  }
}
