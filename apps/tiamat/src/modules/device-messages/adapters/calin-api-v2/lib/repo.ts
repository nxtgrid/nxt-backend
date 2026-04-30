import axios from 'axios';
import { decode } from 'jsonwebtoken';

type RequestObj = Record<string, string | number | boolean>;

export class CalinApiV2Error extends Error {
  constructor(message: string, public readonly code?: number) {
    super(message);
    this.name = 'CalinApiV2Error';
  }
}

export type CalinApiV2DataItem =
  // Reads
  | 'Current Credit Balance'
  | 'Phase-A Voltage' // | 'Phase-B Voltage' | 'Phase-C Voltage'
  | 'Power'
  | 'Phase-A Current(A)' // | 'Phase-B Current(A)' | 'Phase-C Current(A)'
  | 'Maximum power threshold'
  | 'Meter Firmware Version'
  // Not implemented
  // | 'The Number Of Power Down'
  // | 'Special status identifier'

  // Write
  | 'Clock(time)'

  // Control
  | 'Relay On/Off'  // 'Connected

  // Tokens
  | 'Token'
;

// Example READ STATUS CHECK response
// {
//   "code": 0,
//   "reason": "success",
//   "result": {
//     "total": 1,
//     "data": [
//       {
//         "id": 3800,
//         "customerId": "1",
//         "customerName": "Komponentofficetest",
//         "concentratorId": "230401081",
//         "meterId": "47003104321",
//         "name": "Current Credit Balance",
//         "data": "108.8",
//         "dataPrefix": "Current Credit Balance(kWh)",
//         "status": 1,
//         "createId": "AMR01",
//         "createDate": "2024-05-16 07:56:18",
//         "updateId": "AMR01",
//         "updateDate": "2024-05-16 07:56:18",
//         "remark": null,
//         "company": "NXT"
//       }
//     ]
//   }
// }

export type CalinApiV2CreateTaskResponse = {
  code: 0;
  reason: 'success';
  result?: {
    id: string;
  }[]
}

export type CalinApiV2TaskDataResponse = {
  code: 0;
  reason: 'success';
  result?: {
    token?: string;
    data?: {
      name: CalinApiV2DataItem;
      status: 0 | 1 | 2 | 3;    // Processing | Success | Failed | (Token) Rejected
      data: number | string;    // The actual result value
      pn?: string;              // @TODO :: Check type
    }[];
  }
}

type CalinApiV2Response = CalinApiV2CreateTaskResponse | CalinApiV2TaskDataResponse;

const {
  CALIN_V2_API,
  CALIN_V2_ADMIN_USERNAME,
  CALIN_V2_PASSWORD,
  CALIN_V2_COMPANY_NAME,
} = process.env;

const CUSTOM_LOGIN_TIMEOUT_MS = 5000;
const FETCH_RETRIES = 3;

const LOGIN_CREDENTIALS = {
  userId: CALIN_V2_ADMIN_USERNAME,
  password: CALIN_V2_PASSWORD,
  company: CALIN_V2_COMPANY_NAME,
};

let _CACHED_TOKEN: { token: string; exp: number; };

const _fetchToken = async () => {
  for(let i = 0; i < FETCH_RETRIES; i++) {
    try {
      const { data } = await axios.post(
        `${ CALIN_V2_API }/API/User/Login`,
        LOGIN_CREDENTIALS,
        { timeout: CUSTOM_LOGIN_TIMEOUT_MS },
      );

      const _freshToken = data?.result?.token;

      if(!_freshToken) {
        if(i === FETCH_RETRIES - 1) console.error('⚠️ Calin login is failing. We may have to restart the server.');
        console.error('[CALIN V2 API LOGIN] Didn\'t receive a login token,', data?.reason);
      }

      console.info('[CALIN V2 API LOGIN] Got a login token 🥳 🎉');

      _CACHED_TOKEN = _freshToken ? {
        token: _freshToken,
        // Get expiry from token and store as ms to compare in subsequent calls
        exp: (decode(_freshToken) as any).exp * 1000,
      } : undefined;

      break;
    }
    catch(err) {
      console.error('[CALIN_V2 LOGIN] Got a direct error 🤬 ❌:',  err.cause?.code ?? err.code ?? err);
      if(i === FETCH_RETRIES - 1) console.error('⚠️ Calin login is failing. We may have to restart the server.');
    }
  }
};

export const sendCalinApiV2Request = async <T extends CalinApiV2Response>(path: string, body: RequestObj | RequestObj[] ): Promise<T> => {
  // 1. Fetch token if not there or if expired
  if(!_CACHED_TOKEN || _CACHED_TOKEN.exp - Date.now() < 1000) await _fetchToken();

  // 2. If for some reason token API is down, stop execution
  if(!_CACHED_TOKEN) throw new CalinApiV2Error('CALIN API V2 failed to get a token');

  // 3. If we have a token, try API call
  const _fetchOptions = {
    method: 'post',
    url: CALIN_V2_API + path,
    headers: { Authorization: `Bearer ${ _CACHED_TOKEN.token }` },
    data: body,
  };

  for(let i = 0; i < FETCH_RETRIES; i++) {
    try {
      const { data } = await axios(_fetchOptions);

      if(data.code !== 0 || data.reason !== 'success' ) {
        console.info(`
          =============================================================
          CALIN V2 responsed with something other than code 0 'success'
          =============================================================
        `, data);
      }

      // 4a. If all went well, we return the data
      return data;
    }
    catch(err) {
      // 4b. If instead we have an error, differentiate between auth errors and other errors
      if(err?.response?.status === 401) {
        console.info('[CALIN API V2] Unauthorized, going to retry by fetching new token first');
        break;
      }
      else {
        const baseMsg = '[CALIN API V2] Fetch error';
        if(err.cause) console.error(baseMsg + ' with cause:', err.cause);
        else if(err.response?.statusText) console.error(baseMsg + ' with statusText:', err.response?.statusText);
        else console.error(baseMsg + ' raw:', err);

        if(i === FETCH_RETRIES - 1) throw new CalinApiV2Error('CALIN API V2 is down');
      }
    }
  }

  // 5. If we had an auth error, try fetching a new token
  await _fetchToken();
  if(!_CACHED_TOKEN) throw new CalinApiV2Error('[CALIN API V2] Can\'t log in, API may be down');

  // 6. Retry with new token
  _fetchOptions.headers.Authorization = `Bearer ${ _CACHED_TOKEN.token }`;

  for(let i = 0; i < FETCH_RETRIES; i++) {
    try {
      const { data: finalAttemptResult } = await axios(_fetchOptions);

      if(finalAttemptResult.code !== 0 || finalAttemptResult.reason !== 'success' ) {
        console.info(`
          =============================================================
          CALIN V2 responsed with something other than code 0 'success'
          =============================================================
        `, finalAttemptResult);
      }

      return finalAttemptResult;
    }
    catch(err) {
      console.error('[CALIN API V2] Fetch error even after retry', err.cause ?? err);
      // 7. If things fail even after token retry, throw the error
      if(i === FETCH_RETRIES - 1) throw new CalinApiV2Error('CALIN API V2 is down');
    }
  }
};
