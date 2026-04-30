import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { generateRandomNumber } from '@helpers/utilities';
import { GenerateTokenDto } from '../../dto/generate-token.dto';

const { STS_GENERATOR_API } = process.env;

interface NxtStsTokenDto {
  decoderKey: string;
  randomNumber: number;
  issueDate: string;
  type: 'TOP_UP' | 'SET_POWER_LIMIT' | 'CLEAR_CREDIT' | 'CLEAR_TAMPER';
  kwh?: number;
  powerLimit?: number;
}

@Injectable()
export class NxtStsTokenService {
  constructor(
    protected readonly httpService: HttpService,
  ) { }
  async generate({ type, issueDateString, deviceData: { decoderKey }, payload }: GenerateTokenDto): Promise<string> {
    const { axiosRef } = this.httpService;

    const body: NxtStsTokenDto = {
      decoderKey,
      randomNumber: generateRandomNumber(12),
      issueDate: issueDateString,
      type,
      ...payload,
    };

    return axiosRef
      .post(`${ STS_GENERATOR_API }/token`, body)
      .then(({ data: { token } }) => {
        if(!token) throw new Error('[NXT STS TOKEN SERVICE] Failed to generate token');
        return token;
      })
      .catch(err => {
        console.error('[NXT STS TOKEN SERVICE] Fetch error', err.response?.data ?? err.cause ?? err);
        console.error('    for data', body);
        throw new Error('[NXT STS TOKEN SERVICE] Failed to generate token');
      })
    ;
  }
}
