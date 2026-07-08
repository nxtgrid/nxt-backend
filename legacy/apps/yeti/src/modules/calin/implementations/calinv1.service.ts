import { Injectable } from '@nestjs/common';
import { Meter } from '@core/modules/meters/entities/meter.entity';
import { CalinConcentrator } from '../../dcu-snapshot-1-min/dto/calin-concentrator';
import moment from 'moment';
import { MeterSnapshot1H } from '@timeseries/entities/meter-snapshot-1-h.entity';
import { CalinService } from '@core/modules/calin/calin.service';

@Injectable()
export class CalinV1Service extends CalinService {
  sendRequest = this.createApiConnection('CALIN_V1').sendRequest;

  async getConsumptionDataByMetersAndDate(meters: Meter[], date: moment.Moment): Promise<MeterSnapshot1H[]> {
    const queryList: any[] = [];

    // build the query
    for (const meter of meters) {
      queryList.push({
        MeterNo: meter.external_reference,
        Year: date.year(),
        Month: date.month() + 1,
        Day: date.date(),
      });
    }

    const result = await this.sendRequest({
      path: '/COMM_HourlyDataNew',
      body: {
        CompanyName: process.env.CALIN_V1_COMPANY_NAME,
        UserName: process.env.CALIN_V1_MAINTENANCE_USERNAME,
        Password: process.env.CALIN_V1_PASSWORD,
        QueryList: queryList,
      },
    });

    // {
    //   "ResultCode": "00",
    //   "Reason": "OK",
    //   "Result": [
    //     {
    //       "MeterNo": "47001582544",
    //       "Year": 2023,
    //       "Month": 5,
    //       "Day": 2,
    //       "TotalUnitsCounter": 167.47,
    //       "CurrentCreditRegister": 3.63,
    //       "RelayStatus": 0,
    //       "HourlyConsumption_0to1": 0,
    //       "HourlyConsumption_1to2": 0,
    //       "HourlyConsumption_2to3": 0,
    //       "HourlyConsumption_3to4": 0,
    //       "HourlyConsumption_4to5": 0,
    //       "HourlyConsumption_5to6": 0,
    //       "HourlyConsumption_6to7": 0,
    //       "HourlyConsumption_7to8": 0,
    //       "HourlyConsumption_8to9": 0,
    //       "HourlyConsumption_9to10": 0,
    //       "HourlyConsumption_10to11": 0,
    //       "HourlyConsumption_11to12": 0,
    //       "HourlyConsumption_12to13": 0,
    //       "HourlyConsumption_13to14": 0,
    //       "HourlyConsumption_14to15": 0,
    //       "HourlyConsumption_15to16": 0,
    //       "HourlyConsumption_16to17": 0,
    //       "HourlyConsumption_17to18": 0,
    //       "HourlyConsumption_18to19": 0,
    //       "HourlyConsumption_19to20": 0.2,
    //       "HourlyConsumption_20to21": 0.38,
    //       "HourlyConsumption_21to22": 0.36,
    //       "HourlyConsumption_22to23": 0.36,
    //       "HourlyConsumption_23to24": 0.1
    //     }
    //   ]
    // }

    const calinResults = result?.Result;
    if (!Array.isArray(calinResults) || !calinResults.length) return [];

    const datapoints: MeterSnapshot1H[] = [];
    for (const calinResult of calinResults) {
      const meter = meters.find(({ external_reference }) => external_reference === calinResult.MeterNo);

      if (!meter) {
        console.info(`Cannot find meter with external reference ${ calinResult.MeterNo }`);
        continue;
      }

      for (let i = 0; i < 24; i++) {
        const consumptionkWh = parseFloat(calinResult[`HourlyConsumption_${ i }to${ i + 1 }`]);

        // spoken with max from calin. he said that calin returns data in the timezone of the grid.
        // so we need to use the timezone field in the grid object and use that to initialize the
        // datapoints
        const hour = moment.tz({
          year: calinResult.Year,
          month: calinResult.Month - 1,
          date: calinResult.Day,
          hour: i,
          minute: 0,
        }, meter?.connection?.customer?.grid?.timezone);

        datapoints.push({
          meter_id: meter.id,
          grid_id: meter.connection?.customer?.grid?.id,
          created_at: hour.toDate(),
          consumption_kwh: consumptionkWh,
          meter_external_reference: meter.external_reference,
          meter_type: meter.meter_type,
          meter_phase: meter.meter_phase,
          grid_name: meter.dcu?.grid?.name,
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

    return datapoints;
  }

  async getConcentrators(): Promise<CalinConcentrator[]> {
    const result = await this.sendRequest({
      path: '/COMM_OnlineStatus',
      body: {
        CompanyName: process.env.CALIN_V1_COMPANY_NAME,
        UserName: process.env.CALIN_V1_MAINTENANCE_USERNAME,
        Password: process.env.CALIN_V1_PASSWORD,
      },
    });

    // @TOMMASO :: What if this returns `undefined` (or errors out like before this code change?)
    return result?.Result
      .map(({ Status, ConcentratorNo }) => ({ is_online: Status, external_reference: ConcentratorNo }));
  }
}
