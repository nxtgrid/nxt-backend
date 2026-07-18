import axios from 'axios';
import { toSafeNumberOrNull } from '@helpers/number-helpers';

export class CalinApiV1Error extends Error {
  constructor(message: string, public readonly code?: number | string) {
    super(message);
    this.name = 'CalinApiV1Error';
  }
}

const { CALIN_V1_API } = process.env;

// @NOTE :: This has overlap with CalinApiV1ReadMap in _outgoing
export type CalinApiV1DataItem =
  // Read
  | 'Current Credit Register'
  | 'Voltage' | 'VoltageA' | 'VoltageB' | 'VoltageC'
  | 'Power' /* | 'PowerA' | 'PowerB' | 'PowerC' */
  | 'Current' | 'CurrentA' | 'CurrentB' | 'CurrentC'
  | 'Maximum power threshold'
  | 'Version'
  // Not implemented
  // | 'The number of power down'
  // | 'Special status identifier'

  // Read/Write
  | 'Date'

  // Control
  | 'Switch On'
  | 'Switch Off'

  // Token
  | 'Token'
;

export type CalinApiV1CommResponse = {
  Result?: {
    TaskNo: string;
    Status: 'True' | 'False' | 'unknown' | null;
    DataItem: CalinApiV1DataItem;
    Data: string;
  };
  ResultCode: '00' | '99';
  Reason: 'OK' | 'other error';
}

export type CalinApiV1PosResponse = {
  result?: { token: string; }
  result_code: 0;
  reason: 'OK';
}

export type CalinApiV1MaintenanceResponse = {
  result?: string;
  result_code: 0;
  reason: 'OK';
}

type CalinApiV1Response =
  | CalinApiV1CommResponse
  | CalinApiV1PosResponse
  | CalinApiV1MaintenanceResponse;

export const sendCalinApiV1Request = async <T extends CalinApiV1Response>(path: string, body: Record<string, string | number | boolean>): Promise<T> => {
  try {
    const { data } = await axios.post(CALIN_V1_API + path, body);
    if(
      (data.result_code && data.result_code !== 0) ||
      (data.reason && data.reason !== 'OK') ||
      (data.ResultCode && ![ '00', '99' ].includes(data.ResultCode)) ||
      (data.Reason && ![ 'OK', 'other error' ].includes(data.Reason))
    ) {
      console.info(`
        =====================================================
        [CALIN V1 API Got an unexpected result code or reason
        =====================================================
      `, data);
    }
    return data;
  }
  catch(err) {
    let message: string;
    let code: number | string;
    const contentType = err.response?.headers?.['content-type'];

    // HTML (crash)
    if (contentType?.includes('text/html')) {
      message = '[CALIN V1 API] responded with a HTML page..';
      code = toSafeNumberOrNull(err.response?.status);
    }

    // Hangups
    else if (err.code === 'ECONNREFUSED') {
      console.error('ECONNREFUSED on path', err.request?._options?.path);
      message = '[CALIN V1 API] could not be reached, connection was refused';
      code = err.code;
    }
    else if (err.code === 'ECONNRESET') {
      console.error('ECONNRESET on path', err.request?._options?.path);
      message = '[CALIN V1 API] abruptly closed its end of the connection';
      code = err.code;
    }

    // With response object
    else if(err.response) {
      console.error('[CALIN V1 API] Error with a response object for path', err.request.path);
      message = `[CALIN V1 API] is down: ${ err.response.data?.Message }`;
      code = toSafeNumberOrNull(err.response.status);
    }

    // Unknown
    else if(err.cause) {
      console.error('[CALIN V1 API] Error with (unhandled) cause', err);
      message = '[CALIN V1 API] is down';
      code = err.cause.code;
    }
    else if(err.message) {
      console.error('[CALIN V1 API] Error with a message', err);
      message = '[CALIN V1 API] is down';
      code = toSafeNumberOrNull(err.response?.status);
    }
    else {
      console.error('[CALIN V1 API] Error without response, cause, or message', err);
      message = '[CALIN V1 API] is down';
      code = toSafeNumberOrNull(err.response?.status);
    }
    // console.error('  for data', err.config?.data);

    console.error(message, code);
    throw new CalinApiV1Error(message, code);
  }
};
