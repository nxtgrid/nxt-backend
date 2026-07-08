import { Injectable } from '@nestjs/common';
import { DeviceMessage, FailureContext, SetDatePayload } from '../../lib/types';
import { CalinApiV1Error, CalinApiV1CommResponse, sendCalinApiV1Request } from './lib/repo';
import { isPhaseSpecificReadInteraction, isTokenInteraction, PhaseSpecificReadTypes } from '@tiamat/modules/meter-interactions/lib/meter-interaction-type-helpers';
import { toSafeNumberOrNull } from '@helpers/number-helpers';
import { PhaseEnum } from '@core/types/device-messaging';

const { CALIN_V1_COMPANY_NAME, CALIN_V1_ADMIN_USERNAME, CALIN_V1_ADMIN_PASSWORD } = process.env;

const COMM_API_DATA = {
  CompanyName: CALIN_V1_COMPANY_NAME,
  UserName: CALIN_V1_ADMIN_USERNAME,
  Password: CALIN_V1_ADMIN_PASSWORD,
};

const CalinApiV1ReadMap = {
  READ_CREDIT: 'Current Credit Register',
  READ_VOLTAGE: 'Voltage',
  READ_POWER: 'Power',
  READ_CURRENT: 'Current',
  READ_POWER_LIMIT: 'Maximum power threshold',
  READ_VERSION: 'Version',
  READ_DATE: 'Date',
  // READ_TIME: 'Time',
  // READ_POWER_DOWN_COUNT: 'The number of power down',
  // READ_SPECIAL_STATUS (_IDENTIFIER?): 'Special status identifier',
} as const;

type CalinPhaseReadEnum = 'VoltageA' | 'VoltageB' | 'VoltageC' /* | 'PowerA' | 'PowerB' | 'PowerC' */ | 'CurrentA' | 'CurrentB' | 'CurrentC';

// Phase-specific read commands for CALIN API V1
const CalinApiV1PhaseReadMap: Record<PhaseSpecificReadTypes, Record<PhaseEnum, CalinPhaseReadEnum>> = {
  READ_VOLTAGE: { A: 'VoltageA', B: 'VoltageB', C: 'VoltageC' },
  // READ_POWER: { A: 'PowerA', B: 'PowerB', C: 'PowerC' },
  READ_CURRENT: { A: 'CurrentA', B: 'CurrentB', C: 'CurrentC' },
};

const CalinApiV1ControlMap = {
  TURN_ON: 'Switch On',
  TURN_OFF: 'Switch Off',
} as const;

const CalinApiV1WriteMap = {
  SET_DATE: 'Date',
  // SET_TIME: 'Time',
} as const;

type ImplementedMessageReadTypes = keyof typeof CalinApiV1ReadMap;
type ImplementedMessageControlTypes = keyof typeof CalinApiV1ControlMap;
type ImplementedMessageWriteTypes = keyof typeof CalinApiV1WriteMap;

type CalinApiV1ReadTask = typeof CalinApiV1ReadMap[ImplementedMessageReadTypes] | CalinPhaseReadEnum;
type CalinApiV1ControlTask = typeof CalinApiV1ControlMap[ImplementedMessageControlTypes];
type CalinApiV1WriteTask = typeof CalinApiV1WriteMap[ImplementedMessageWriteTypes];

/** Type guard: checks at runtime AND narrows the type for TypeScript. */
const isCalinApiV1ReadCommand = (messageType: string): messageType is ImplementedMessageReadTypes => messageType in CalinApiV1ReadMap;
const isCalinApiV1ControlCommand = (messageType: string): messageType is ImplementedMessageControlTypes => messageType in CalinApiV1ControlMap;
const isCalinApiV1WriteCommand = (messageType: string): messageType is ImplementedMessageWriteTypes => messageType in CalinApiV1WriteMap;

@Injectable()
export class CalinApiV1OutgoingService {
  async sendOne(message: DeviceMessage): Promise<string> {
    const { external_reference } = message.device;

    if (isCalinApiV1ReadCommand(message.message_type)) {
      const dataItem = this.getReadDataItem(message.message_type, message.phase);
      return this.requestRead(dataItem, external_reference);
    }

    if(isCalinApiV1ControlCommand(message.message_type)) {
      return this.requestControl(CalinApiV1ControlMap[message.message_type], external_reference);
    }

    if(isCalinApiV1WriteCommand(message.message_type)) {
      const parsedPayload = this.parsePayload(message.message_type, message.request_data?.payload);
      return this.requestWrite(CalinApiV1WriteMap[message.message_type], parsedPayload, external_reference);
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

  parseError(err: CalinApiV1Error): FailureContext {
    return {
      reason: err.message,
      errorCode: err.code,
      // For error code 99 (rejected tokens) we can fail immediately
      skipRetry: err.code === 99,
    };
  }

  /**
   * Get the correct DataItem string for a read command.
   * Uses phase-specific commands when phase is provided.
   */
  private getReadDataItem(
    messageType: ImplementedMessageReadTypes,
    phase?: PhaseEnum,
  ): CalinApiV1ReadTask {
    // If phase is specified and this is a phase-specific read type
    if (phase && isPhaseSpecificReadInteraction(messageType)) {
      const phaseMap = CalinApiV1PhaseReadMap[messageType];
      if (phaseMap) return phaseMap[phase] as CalinApiV1ReadTask; // @TODO :: Improve typing
    }
    // Fall back to default (single-phase) command
    return CalinApiV1ReadMap[messageType];
  }

  /**
   * API
  **/

  private async requestRead(taskType: CalinApiV1ReadTask, MeterNo: string): Promise<string> {
    const res = await sendCalinApiV1Request<CalinApiV1CommResponse>('/COMM_RemoteReading', {
      ...COMM_API_DATA,
      MeterNo,
      DataItem: taskType,
    });

    const taskId = res.Result?.TaskNo;

    if (!taskId) {
      const errorMessage = `CALIN API V1 did not schedule task because: ${ res.Reason ?? 'unknown' }`;
      throw new CalinApiV1Error(errorMessage, toSafeNumberOrNull(res.ResultCode));
    }

    return taskId;
  }

  private async requestControl(taskType: CalinApiV1ControlTask, MeterNo: string): Promise<string> {
    const res = await sendCalinApiV1Request<CalinApiV1CommResponse>('/COMM_RemoteControl', {
      ...COMM_API_DATA,
      MeterNo,
      DataItem: taskType,
    });

    const taskId = res.Result?.TaskNo;

    if (!taskId) {
      const errorMessage = `CALIN API V1 did not schedule task because: ${ res.Reason ?? 'unknown' }`;
      throw new CalinApiV1Error(errorMessage, toSafeNumberOrNull(res.ResultCode));
    }

    return taskId;
  }

  private async requestWrite(taskType: CalinApiV1WriteTask, Data: string, MeterNo: string): Promise<string> {
    const res = await sendCalinApiV1Request<CalinApiV1CommResponse>('/COMM_RemoteWrite', {
      ...COMM_API_DATA,
      MeterNo,
      DataItem: taskType,
      Data,
    });

    const taskId = res.Result?.TaskNo;

    if (!taskId) {
      const errorMessage = `CALIN API V1 did not schedule task because: ${ res.Reason ?? 'unknown' }`;
      throw new CalinApiV1Error(errorMessage, toSafeNumberOrNull(res.ResultCode));
    }

    return taskId;
  }

  private async requestTokenDelivery(token: string, MeterNo: string): Promise<string> {
    const res = await sendCalinApiV1Request<CalinApiV1CommResponse>('/COMM_RemoteToken', {
      ...COMM_API_DATA,
      MeterNo,
      Token: token,
    });

    const taskId = res.Result?.TaskNo;

    if(!taskId) {
      const errorMessage = res.ResultCode === '99' ?
        `Token ${ token } was immediately rejected for meter ${ MeterNo }, possibly already delivered` :
        `CALIN API V1 did not schedule task because: ${ res.Reason ?? 'unknown' }`;
      throw new CalinApiV1Error(errorMessage, toSafeNumberOrNull(res.ResultCode));
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
  // Normalize 2-digit years to 20xx. The Date constructor would otherwise
  // treat values 0-99 as 1900-1999, silently producing the wrong weekday.
  const fullYear = year < 100 ? 2000 + year : year;
  // Use UTC explicitly: the DTO carries grid-local calendar values and the
  // server typically runs in UTC, so we treat year/month/day as a literal
  // calendar date rather than a server-local timestamp.
  const weekday = new Date(Date.UTC(fullYear, month - 1, day)).getUTCDay();
  const yy = String(fullYear % 100).padStart(2, '0');
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  const ww = String(weekday).padStart(2, '0');
  return `${ yy }${ mm }${ dd }${ ww }`;
};
