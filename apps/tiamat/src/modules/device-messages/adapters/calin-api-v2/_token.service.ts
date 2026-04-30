import { Injectable } from '@nestjs/common';
import { GenerateTokenDto } from '../../dto/generate-token.dto';
import { CalinApiV2TaskDataResponse, sendCalinApiV2Request } from './lib/repo';
import { v4 as uuidv4 } from 'uuid';

const { CALIN_V2_POS_PASSWORD, CALIN_V2_COMPANY_NAME } = process.env;

@Injectable()
export class CalinApiV2TokenService {
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
      const message = '[CALIN API V2 TOKEN SERVICE] Got an empty response'/*  + res.failureReason ? ` because: ${ res.failureReason }` : '' */;
      console.warn(message, res.failureReason);
      throw new Error(message);
    }

    return res.token;
  }

  private async generateTopupToken(meterId: string, amount: number) {
    const res = await sendCalinApiV2Request<CalinApiV2TaskDataResponse>('/API/Token/CreditToken/Generate', {
      meterId,
      amount,
      company: CALIN_V2_COMPANY_NAME,
      authorizationPassword: CALIN_V2_POS_PASSWORD,
      isPreview: false,
      isVendByTotalPaid: false,
      serialNumber: uuidv4(),
    });
    return { token: res?.result?.token, failureReason: res?.reason };
  }

  private async generatePowerLimitToken(meterId: string, maximumPower: number) {
    const res = await sendCalinApiV2Request<CalinApiV2TaskDataResponse>('/API/Token/SetMaximumPowerLimitToken/Generate', {
      meterId,
      maximumPower,
      company: CALIN_V2_COMPANY_NAME,
    });
    return { token: res?.result?.token, failureReason: res?.reason };
  }

  private async generateClearTamperToken(meterId: string) {
    const res = await sendCalinApiV2Request<CalinApiV2TaskDataResponse>('/API/Token/ClearTamperToken/Generate', {
      meterId,
      company: CALIN_V2_COMPANY_NAME,
    });
    return { token: res?.result?.token, failureReason: res?.reason };
  }

  private async generateClearCreditToken(meterId: string) {
    const res = await sendCalinApiV2Request<CalinApiV2TaskDataResponse>('/API/Token/ClearCreditToken/Generate', {
      meterId,
      company: CALIN_V2_COMPANY_NAME,
    });
    return { token: res?.result?.token, failureReason: res?.reason };
  }
}
