import { Injectable } from '@nestjs/common';
import { CalinApiV1MaintenanceResponse, CalinApiV1PosResponse, sendCalinApiV1Request } from './lib/repo';
import { GenerateTokenDto } from '../../dto/generate-token.dto';

const {
  CALIN_V1_COMPANY_NAME,
  CALIN_V1_POS_USERNAME,
  CALIN_V1_POS_PASSWORD,
  CALIN_V1_MAINTENANCE_USERNAME,
  CALIN_V1_MAINTENANCE_PASSWORD,
} = process.env;

const POS_API_DATA = {
  company_name: CALIN_V1_COMPANY_NAME,
  user_name: CALIN_V1_POS_USERNAME,
  password: CALIN_V1_POS_PASSWORD,
  password_vend: CALIN_V1_POS_PASSWORD,
  is_vend_by_unit: true,
};

const MAINTENANCE_API_DATA = {
  company_name: CALIN_V1_COMPANY_NAME,
  user_name: CALIN_V1_MAINTENANCE_USERNAME,
  password: CALIN_V1_MAINTENANCE_PASSWORD,
};

@Injectable()
export class CalinApiV1TokenService {
  async generate({ type, payload, deviceData }: GenerateTokenDto): Promise<string> {
    let res: { token?: string; failureReason?: string; };

    switch(type) {
      case 'TOP_UP': {
        res = await this.generateTopupToken(deviceData.external_reference, payload?.kwh);
        break;
      }
      case 'SET_POWER_LIMIT': {
        res = await this.generatePowerLimitToken(deviceData.external_reference, payload?.powerLimit);
        break;
      }
      case 'CLEAR_TAMPER': {
        res = await this.generateClearTamperToken(deviceData.external_reference);
        break;
      }
      case 'CLEAR_CREDIT': {
        res = await this.generateClearCreditToken(deviceData.external_reference);
        break;
      }
      default: {
        throw new Error(`Can't generate a token for type ${ type }; not implemented.`);
      }
    }

    if(!res.token) {
      // @TODO :: Logging errors to see best response
      const message = '[CALIN API V1 TOKEN SERVICE] Got an empty response'/*  + res.failureReason ? ` because: ${ res.failureReason }` : '' */;
      console.warn(message, res.failureReason);
      throw new Error(message);
    }

    return res.token;
  }

  private async generateTopupToken(meter_number: string, amount: number) {
    const res = await sendCalinApiV1Request<CalinApiV1PosResponse>('/POS_Purchase', {
      ...POS_API_DATA,
      meter_number,
      amount,
    });
    return { token: res?.result?.token, failureReason: res?.reason };
  }

  private async generatePowerLimitToken(meter_number: string, max_power: number) {
    const res = await sendCalinApiV1Request<CalinApiV1MaintenanceResponse>('/Maintenance_SetMaxPower', {
      ...MAINTENANCE_API_DATA,
      meter_number,
      max_power,
    });
    return { token: res?.result, failureReason: res?.reason };
  }

  private async generateClearTamperToken(meter_number: string) {
    const res = await sendCalinApiV1Request<CalinApiV1MaintenanceResponse>('/Maintenance_ClearTamper', {
      ...MAINTENANCE_API_DATA,
      meter_number,
    });
    return { token: res?.result, failureReason: res?.reason };
  }

  private async generateClearCreditToken(meter_number: string) {
    const res = await sendCalinApiV1Request<CalinApiV1MaintenanceResponse>('/Maintenance_ClearCredit', {
      ...MAINTENANCE_API_DATA,
      meter_number,
    });
    return { token: res?.result, failureReason: res?.reason };
  }
}
