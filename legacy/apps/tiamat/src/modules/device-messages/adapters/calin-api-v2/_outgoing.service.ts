import { Injectable } from '@nestjs/common';
import { DeviceMessage, FailureContext, SetDatePayload } from '../../lib/types';
import { CalinApiV2CreateTaskResponse, CalinApiV2Error, sendCalinApiV2Request } from './lib/repo';
import { isTokenInteraction } from '@tiamat/modules/meter-interactions/lib/meter-interaction-type-helpers';

const { CALIN_V2_CUSTOMER_ID, CALIN_V2_COMPANY_NAME } = process.env;

// @NOTE :: Calling '/api/dlms/readDlmsTree' with { "Company": "NXT", "lang": "en", "version": "1.1" }
// will render a list of all available commands with their protocolIds
const CalinApiV2ReadMap = {
  READ_CREDIT: 39,
  READ_VOLTAGE: 5,
  READ_POWER: 11,
  READ_CURRENT: 8,
  READ_POWER_LIMIT: 46,
  READ_VERSION: 45,
  READ_DATE: 29,
  // READ_POWER_DOWN_COUNT: 47,
  // READ_TERMINAL_COVER_LAST_OPENED: 42,
  // READ_SPECIAL_STATUS (_IDENTIFIER?): 43,
  // READ_RELAY_STATUS: 37 // CALIN V2 only
} as const;

const CalinApiV2ControlMap = {
  TURN_ON: 20000,
  TURN_OFF: 20001,
} as const;

const CalinApiV2WriteMap = {
  SET_DATE: 10000,
  // SET_TIME: 'Time',
} as const;

const CALIN_V2_TOKEN_DELIVERY_PROTOCOL_ID = 30000;

type ImplementedMessageReadTypes = keyof typeof CalinApiV2ReadMap;
type ImplementedMessageControlTypes = keyof typeof CalinApiV2ControlMap;
type ImplementedMessageWriteTypes = keyof typeof CalinApiV2WriteMap;

type CalinApiV2ReadTask = typeof CalinApiV2ReadMap[ImplementedMessageReadTypes];
type CalinApiV2ControlTask = typeof CalinApiV2ControlMap[ImplementedMessageControlTypes];
type CalinApiV2WriteTask = typeof CalinApiV2WriteMap[ImplementedMessageWriteTypes];

/** Type guard: checks at runtime AND narrows the type for TypeScript. */
const isCalinApiV2ReadCommand = (messageType: string): messageType is ImplementedMessageReadTypes => messageType in CalinApiV2ReadMap;
const isCalinApiV2ControlCommand = (messageType: string): messageType is ImplementedMessageControlTypes => messageType in CalinApiV2ControlMap;
const isCalinApiV2WriteCommand = (messageType: string): messageType is ImplementedMessageWriteTypes => messageType in CalinApiV2WriteMap;

@Injectable()
export class CalinApiV2OutgoingService {
  async sendOne(message: DeviceMessage): Promise<string> {
    const { external_reference } = message.device;

    if(isCalinApiV2ReadCommand(message.message_type)) {
      return this.requestRead(CalinApiV2ReadMap[message.message_type], external_reference);
    }

    if(isCalinApiV2ControlCommand(message.message_type)) {
      return this.requestControl(CalinApiV2ControlMap[message.message_type], external_reference);
    }

    if(isCalinApiV2WriteCommand(message.message_type)) {
      const parsedPayload = this.parsePayload(message.message_type, message.request_data?.payload);
      return this.requestWrite(CalinApiV2WriteMap[message.message_type], parsedPayload, external_reference);
    }

    if(isTokenInteraction(message.message_type)) {
      return this.requestTokenDelivery(message.request_data.token, external_reference);
    }

    throw new Error('Not implemented');
  }

  // @TODO :: NOOP, adjust typing
  getRemoteStatus() {
    return { delivery_status: 'noop' };
  }

  parseError(err: Error | CalinApiV2Error): FailureContext {
    if(err instanceof CalinApiV2Error) {
      return {
        reason: err.message,
        errorCode: err.code,
      };
    }
    console.error('[CALIN V2 API] Parsing a non-custom error', err);
    return {
      reason: err.message,
    };
  }


  /**
   * API
  **/

  private async requestRead(protocolId: CalinApiV2ReadTask, meterId: string): Promise<string> {
    const res = await sendCalinApiV2Request<CalinApiV2CreateTaskResponse>('/API/RemoteMeterTask/CreateReadingTask', [ {
      meterId,
      protocolId,
      customerId: CALIN_V2_CUSTOMER_ID,
      company: CALIN_V2_COMPANY_NAME,
    } ]);

    // console.log(res);
    const taskId = res.result?.[0]?.id;

    if (!taskId) {
      const errorMessage = `CALIN API V2 did not schedule task because: ${ res.reason ?? 'unknown' }`;
      throw new CalinApiV2Error(errorMessage);
    }

    return taskId;
  }

  private async requestControl(protocolId: CalinApiV2ControlTask, meterId: string): Promise<string> {
    const res = await sendCalinApiV2Request<CalinApiV2CreateTaskResponse>('/API/RemoteMeterTask/CreateControlTask', [ {
      meterId,
      protocolId,
      customerId: CALIN_V2_CUSTOMER_ID,
      company: CALIN_V2_COMPANY_NAME,
    } ]);

    const taskId = res.result?.[0]?.id;

    if (!taskId) {
      const errorMessage = `CALIN API V2 did not schedule task because: ${ res.reason ?? 'unknown' }`;
      throw new CalinApiV2Error(errorMessage);
    }

    return taskId;
  }

  private async requestWrite(protocolId: CalinApiV2WriteTask, data: string, meterId: string): Promise<string> {
    // SET_DATE -> 10000 -> "2026-04-15 11:11:13"
    const res = await sendCalinApiV2Request<CalinApiV2CreateTaskResponse>('/API/RemoteMeterTask/CreateSettingTask', [ {
      meterId,
      protocolId,
      data,
      customerId: CALIN_V2_CUSTOMER_ID,
      company: CALIN_V2_COMPANY_NAME,
    } ]);

    const taskId = res.result?.[0]?.id;

    if (!taskId) {
      const errorMessage = `CALIN API V2 did not schedule task because: ${ res.reason ?? 'unknown' }`;
      throw new CalinApiV2Error(errorMessage);
    }

    return taskId;
  }

  private async requestTokenDelivery(token: string, meterId: string): Promise<string> {
    const res = await sendCalinApiV2Request<CalinApiV2CreateTaskResponse>('/API/RemoteMeterTask/CreateTokenTask', [ {
      meterId,
      protocolId: CALIN_V2_TOKEN_DELIVERY_PROTOCOL_ID,
      data: token,
      customerId: CALIN_V2_CUSTOMER_ID,
      company: CALIN_V2_COMPANY_NAME,
    } ]);

    const taskId = res.result?.[0]?.id;

    if (!taskId) {
      const errorMessage = `CALIN API V2 did not schedule task because: ${ res.reason ?? 'unknown' }`;
      throw new CalinApiV2Error(errorMessage);
    }

    return taskId;
  }

  /**
   * Payload parsing
  **/

  parsePayload(message_type: DeviceMessage['message_type'], payload: DeviceMessage['request_data']['payload']): string {
    if(!payload) throw new Error('Can\'t perform a write request without a payload');
    switch (message_type) {
      case 'SET_DATE': return formatDate(payload as SetDatePayload);
      default:
        throw new Error('Payload parser not implemented');
    }
  }
}

const formatDate = ({ year, month, day }: { year: number; month: number; day: number; }) => {
  if(!(typeof year === 'number') || !(typeof month === 'number') || !(typeof day === 'number')) throw new Error('Invalid payload for setting date');
  // Normalize 2-digit years to 20xx so we never emit "0024-..." for year=24.
  const fullYear = year < 100 ? 2000 + year : year;
  const yyyy = String(fullYear).padStart(4, '0');
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  // The API expects "YYYY-MM-DD HH:mm:ss"; we only set the date so time is 00:00:00
  return `${ yyyy }-${ mm }-${ dd } 00:00:00`;
};
