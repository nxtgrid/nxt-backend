import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { decode } from 'jsonwebtoken';
import { SoftwareDevAlertService } from '@core/modules/software-dev-alert/software-dev-alert.service';
import { CALIN_API_FAIL } from '@core/constants';
import { LokiService } from '../loki/loki.service';
import { CommunicationProtocolEnum } from '@core/types/supabase-types';

const CUSTOM_LOGIN_TIMEOUT_MS = 5000;
const RETRIES = 3;

interface SendRequestOptions {
  path: string
  body: any
  method?: 'get' | 'post',
  isSimulated?: boolean
}

const { CALIN_V1_API, STS_GENERATOR_API, CALIN_SIMULATOR_API } = process.env;

/**
 * @TODO :: Optionally include the retry mechanism for token if still failing often
 */

@Injectable()
export class CalinService {
  constructor(
    protected readonly httpService: HttpService,
    private readonly softwareDevAlertService: SoftwareDevAlertService,
    protected readonly lokiService: LokiService,
  ) {
    // setTimeout(async () => {
    //   const { sendRequest } = this.createApiConnection(CommunicationProtocol.CALIN_V2);
    //   const lala = await sendRequest({
    //     path: '/API/RemoteMeterTask/CreateReadingTask',
    //     body: [ {
    //       customerId: process.env.CALIN_V2_CUSTOMER_ID,
    //       meterId: '47003105484',
    //       protocolId: 39,
    //       company: process.env.CALIN_V2_COMPANY_NAME,
    //     } ],
    //   });

    //   // @TEMPORARY LOGGING
    //   console.info(lala.reason);
    // }, 1000);
  }

  loginErrorReported = false;

  reportLoginError() {
    if(this.loginErrorReported) return;
    this.loginErrorReported = true;
    const telegramMessage = '⚠️ Calin login is failing. Please check the DO logs to see if we need to restart to server.';
    if(process.env.NXT_ENV === 'production')
      this.softwareDevAlertService.viaTelegram(telegramMessage);
  }

  createApiConnection(calinApiVersion: CommunicationProtocolEnum) {
    switch (calinApiVersion) {
      case 'CALIN_V1':
        return this.createApiConnectionV1();
      case 'CALIN_V2':
        return this.createApiConnectionV2();
      case 'CALIN_LORAWAN':
        return this.createApiConnectionLorawan();
    }
  }

  createApiConnectionV1() {
    const { axiosRef } = this.httpService;

    const sendRequest = ({ path, method = 'post', body, isSimulated = false }: SendRequestOptions): Promise<any> => {
      // Meter Simulator is modeled after v1
      const baseUrl = isSimulated ? CALIN_SIMULATOR_API : CALIN_V1_API;
      const messager = isSimulated ? 'CALIN_SIMULATOR' : 'CALIN_V1';

      const fetchOptions = {
        method,
        url: baseUrl + path,
        data: body,
      };

      return axiosRef(fetchOptions)
        .then(({ data }) => data)
        .catch(err => {
          const contentType = err.response?.headers?.['content-type'];
          if (contentType?.includes('text/html')) {
            console.error(`[${ messager }] responded with a HTML page..`, err.response?.status);
          }
          else {
            console.error(`[${ messager }] Fetch error`, err.response?.data ?? err.cause ?? err.message ?? err);
          }
          console.error('  for data', err.config?.data);
          throw new Error(CALIN_API_FAIL);
        })
      ;
    };

    return { sendRequest };
  }

  createApiConnectionV2() {
    const { axiosRef } = this.httpService;

    const TOKENS = {
      CALIN_V2: null,
    };

    const fetchToken = async (): Promise<void> => {
      const baseUrl = process.env.CALIN_V2_API;
      const credentials = {
        userId: process.env.CALIN_V2_ADMIN_USERNAME,
        password: process.env.CALIN_V2_PASSWORD,
        company: process.env.CALIN_V2_COMPANY_NAME,
      };

      let newToken: string;

      const PERF_startof_token = performance.now();

      for(let i = 0; i < RETRIES; i++) {
        try {
          const { data } = await axiosRef.post(`${ baseUrl }/API/User/Login`, credentials, { timeout: CUSTOM_LOGIN_TIMEOUT_MS });
          newToken = data?.result?.token;
          if(!newToken) {
            if(i === RETRIES - 1) this.reportLoginError();
            console.error('[CALIN_V2 LOGIN] Didn\'t receive a login token', data.reason);
          }
          else {
            console.info('[CALIN_V2 LOGIN] Got a login token 🥳 🎉');
            break;
          }
        }
        catch(err) {
          console.error('[CALIN_V2 LOGIN] Got a direct error 🤬 ❌:',  err.cause?.code ?? err.code ?? err);
          if(i === RETRIES - 1) this.reportLoginError();
        }
      }

      const PERF_endof_token = performance.now();
      console.info(`[CALIN_V2 LOGIN] fetching token took ${ Math.round(PERF_endof_token - PERF_startof_token) }ms`);

      TOKENS.CALIN_V2 = newToken ? {
        token: newToken,
        // Get expiry from token and store as ms to compare in subsequent calls
        exp: (decode(newToken) as any).exp * 1000,
      } : null;
    };

    const sendRequest = async ({ path, method = 'post', body }: SendRequestOptions): Promise<any> => {
      // 1. Fetch token if not there or if expired
      if(!TOKENS.CALIN_V2 || TOKENS.CALIN_V2.exp - Date.now() < 1000) await fetchToken();

      // 2. If for some reason token API is down, stop execution
      if(!TOKENS.CALIN_V2) throw new Error(CALIN_API_FAIL);

      // 3. If we have a token, try API call
      const fetchOptions = {
        method,
        url: process.env.CALIN_V2_API + path,
        headers: { Authorization: `Bearer ${ TOKENS.CALIN_V2.token }` },
        data: body,
      };

      for(let i = 0; i < RETRIES; i++) {
        try {
          const response = await axiosRef(fetchOptions);
          // 4a. If all went well, we return the data
          return response.data;
        }
        catch(err) {
          // 4b. If instead we have an error, differentiate between auth errors and other errors
          if(err?.response?.status === 401) {
            console.info('[CALIN_V2] Unauthorized, going to retry by fetching new token first');
          }
          else {
            console.error('[CALIN_V2] Fetch error', err.cause ?? err);

            if(i === RETRIES - 1) throw new Error(CALIN_API_FAIL);
          }
        }
      }

      // 5. If we had an auth error, try fetching a new token
      await fetchToken();
      if(!TOKENS.CALIN_V2) throw new Error(CALIN_API_FAIL);

      // 6. Retry with new token
      fetchOptions.headers.Authorization = `Bearer ${ TOKENS.CALIN_V2.token }`;

      for(let i = 0; i < RETRIES; i++) {
        try {
          const { data: finalAttemptResult } = await axiosRef(fetchOptions);

          return finalAttemptResult;
        }
        catch(err) {
          console.error('[CALIN_V2] Fetch error even after retry', err.cause ?? err);
          // 7. If things fail even after token retry, throw the error
          if(i === RETRIES - 1) throw new Error(CALIN_API_FAIL);
        }
      }
    };

    return { sendRequest };
  }

  createApiConnectionLorawan() {
    const { axiosRef } = this.httpService;

    const sendRequest = ({ path, method = 'post', body }: SendRequestOptions): Promise<any> => {
      const fetchOptions = {
        method,
        url: STS_GENERATOR_API + path, // We use the generator no matter what
        data: body,
      };

      return axiosRef(fetchOptions)
        .then(({ data }) => data)
        .catch(err => {
          console.error('[CALIN_LORAWAN] Fetch error', err.response?.data ?? err.cause ?? err);
          console.error('    for data', err.config?.data);
          throw new Error(CALIN_API_FAIL);
        })
      ;
    };

    return { sendRequest };
  }
}
