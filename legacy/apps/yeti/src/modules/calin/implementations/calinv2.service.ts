import { Injectable } from '@nestjs/common';
import { Meter } from '@core/modules/meters/entities/meter.entity';
import { CalinConcentrator } from '../../dcu-snapshot-1-min/dto/calin-concentrator';
import { CalinService } from '@core/modules/calin/calin.service';
import { MeterSnapshot1H } from '@timeseries/entities/meter-snapshot-1-h.entity';
import moment from 'moment';

@Injectable()
export class Calinv2Service extends CalinService {
  sendRequest = this.createApiConnection('CALIN_V2').sendRequest;

  async getConsumptionDataByMetersAndDate(meters: Meter[], date: moment.Moment): Promise<MeterSnapshot1H[]> {
    const datapoints: MeterSnapshot1H[] = [];
    const dateString = date.toISOString();
    // Iterate through meters to get the daily report for each
    for (const meter of meters) {

      try {
        const { result: { data: dayDataArray } } = await this.sendRequest({
          path: '/API/DailyReport/Read',
          body: {
            concentratorId: meter.dcu.external_reference,
            meterId: meter.external_reference,
            updateDateRange: [
              dateString,
              dateString,
            ],
            lang: 'en',
            company: process.env.CALIN_V2_COMPANY_NAME,
          },
        });
        // {
        //   "code": 0,
        //   "reason": "success",
        //   "result": {
        //     "total": 3,
        //     "data": [
        // {
        //   "customerId": "1",
        //   "customerName": "Komponentofficetest",
        //   "concentratorId": "230401081",
        //   "meterId": "47003104321",
        //   "currentDate": "2024-05-15 23:59:59",
        //   "totalT1": 0.64,
        //   "hourT1_01": 0,
        //   "hourT1_02": 0,
        //   "hourT1_03": 0,
        //   "hourT1_04": 0,
        //   "hourT1_05": 0,
        //   "hourT1_06": 0,
        //   "hourT1_07": 0,
        //   "hourT1_08": 0,
        //   "hourT1_09": 0,
        //   "hourT1_10": 0,
        //   "hourT1_11": 0,
        //   "hourT1_12": 0,
        //   "hourT1_13": 0,
        //   "hourT1_14": 0,
        //   "hourT1_15": 0,
        //   "hourT1_16": 0.07,
        //   "hourT1_17": 0.07,
        //   "hourT1_18": 0.07,
        //   "hourT1_19": 0.07,
        //   "hourT1_20": 0.07,
        //   "hourT1_21": 0.08,
        //   "hourT1_22": 0.07,
        //   "hourT1_23": 0.07,
        //   "hourT1_24": 0.07,
        //   "remainT1": 109.36,
        //   "totalT2": 0,
        //   "hourT2_01": 0,
        //   "hourT2_02": 0,
        //   "hourT2_03": 0,
        //   "hourT2_04": 0,
        //   "hourT2_05": 0,
        //   "hourT2_06": 0,
        //   "hourT2_07": 0,
        //   "hourT2_08": 0,
        //   "hourT2_09": 0,
        //   "hourT2_10": 0,
        //   "hourT2_11": 0,
        //   "hourT2_12": 0,
        //   "hourT2_13": 0,
        //   "hourT2_14": 0,
        //   "hourT2_15": 0,
        //   "hourT2_16": 0,
        //   "hourT2_17": 0,
        //   "hourT2_18": 0,
        //   "hourT2_19": 0,
        //   "hourT2_20": 0,
        //   "hourT2_21": 0,
        //   "hourT2_22": 0,
        //   "hourT2_23": 0,
        //   "hourT2_24": 0,
        //   "remainT2": 0,
        //   "demand": 0.072,
        //   "status_Relay": true,
        //   "status_Battery": true,
        //   "status_Magnetic": true,
        //   "status_Cover_Terminal": true,
        //   "status_Cover_Upper": true,
        //   "status_Cover_Box": true,
        //   "status_Current_Direction": true,
        //   "status_Current_Unbalance": true,
        //   "createId": "System",
        //   "createDate": "2024-05-16 00:30:41",
        //   "updateId": "System",
        //   "updateDate": "2024-05-16 00:30:41",
        //   "remark": null,
        //   "company": "NXT"
        // },
        //     ]
        //   }
        // }

        // We do not add null checks, since the Calin V2 api seems to ignore the days where consumption is always zero.
        // As a consequence, if a meter exists on our system, it's consumption will always be marked as zero.
        // TODO: check again on Jul 11th to see if meter 47003104503 has a zero data vs null data
        const dayData = dayDataArray[0];

        for (let i = 1; i <= 24; i++) {
        // Ivan from Calin says data is in local time, which means that we need to generate
        // a moment object which is in the grid timezone
          const hour = moment.tz({
            year: date.year(),
            month: date.month(),
            date: date.date(),
            hour: i - 1,//we count energy from the beginning of hour instead of the end, like calin does
            minute: 0,
          }, meter?.connection?.customer?.grid?.timezone);

          const consumptionkWh = (dayData) ? parseFloat(dayData[`hourT1_${ ('0' + i).slice(-2) }`]) : 0;

          datapoints.push({
            meter_id: meter.id,
            grid_id: meter.connection?.customer?.grid?.id,
            grid_name: meter.dcu?.grid?.name,
            created_at: hour.toDate(),
            consumption_kwh: consumptionkWh,
            meter_external_reference: meter.external_reference,
            meter_type: meter.meter_type,
            meter_phase: meter.meter_phase,
            organization_name: meter.connection?.customer?.grid?.organization?.name,
            customer_full_name: meter.connection?.customer?.account?.full_name,
            dcu_external_reference: meter.dcu?.external_reference,
            dcu_external_system: meter.dcu?.external_system,
            dcu_id: meter.dcu?.id,
            meter_external_system: meter.external_system,
            organization_id: meter.connection?.customer?.grid?.organization?.id,
            customer_id: meter.connection?.customer?.id,
            connection_id: meter.connection?.id,
            is_hidden_from_reporting: meter.connection?.customer?.is_hidden_from_reporting,
            is_cabin_meter: meter.is_cabin_meter,
          });
        }
      }
      catch(err) {
        console.info('Caught calin v2 exception in meter energy sync loop');
        console.error(err);
      }
    }

    return datapoints;
  }


  async getConcentrators(): Promise<CalinConcentrator[]> {
    const { result } = await this.sendRequest({
      path: '/API/ConcentratorOnlineStatus/Read',
      body: {
        pageNumber: 0,
        pageSize: 100, //not going to make this dynamic since it's only for 500 meters
        company: process.env.CALIN_V2_COMPANY_NAME,
      },
    });

    // @TOMMASO :: What if this returns `undefined` (or errors out like before this code change?)
    return result?.data
      .map(({ status, concentratorId }) => ({ is_online: status, external_reference: concentratorId }));
  }
}
