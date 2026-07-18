import { Injectable } from '@nestjs/common';
import { DeviceMessage, FailureContext, MessageResponseStatus, ParsedIncomingEvent } from '../../lib/types';
import { isReadInteraction, isTokenInteraction, isControlInteraction, isWriteInteraction } from '@tiamat/modules/meter-interactions/lib/meter-interaction-type-helpers';
import { sendCalinApiV1Request, CalinApiV1CommResponse } from './lib/repo';
import { Json } from '@core/types/supabase-types';
import { isEmpty } from 'ramda';
import { toSafeNumberOrNull } from '@helpers/number-helpers';
import { PhaseEnum } from '@core/types/device-messaging';

const { CALIN_V1_COMPANY_NAME, CALIN_V1_ADMIN_USERNAME, CALIN_V1_ADMIN_PASSWORD } = process.env;

const COMM_API_DATA = {
  CompanyName: CALIN_V1_COMPANY_NAME,
  UserName: CALIN_V1_ADMIN_USERNAME,
  Password: CALIN_V1_ADMIN_PASSWORD,
};

const TASK_PATH_MAP = {
  READ: '/COMM_RemoteReadingTask',
  CONTROL: '/COMM_RemoteControlTask',
  WRITE: '/COMM_RemoteWriteTask',
  TOKEN: '/COMM_RemoteTokenTask',
};

// Map DataItem to phase (for three-phase responses)
const DataItemToPhase: Record<string, PhaseEnum> = {
  'VoltageA': 'A', 'VoltageB': 'B', 'VoltageC': 'C',
  // 'PowerA': 'A', 'PowerB': 'B', 'PowerC': 'C',
  'CurrentA': 'A', 'CurrentB': 'B', 'CurrentC': 'C',
};

/**
 * Incoming service for CALIN API V1 (PULL pattern).
 *
 * This adapter uses polling instead of webhooks. The `fetchStatus()` method
 * is called by the incoming service's polling cron to check task completion.
 */
@Injectable()
export class CalinApiV1IncomingService {
  /**
   * Fetch task status from CALIN API V1.
   * Called by the incoming service's polling cron for each message in the awaiting task queue.
   *
   * @param message - The message to check status for (contains delivery_queue_id = TaskNo)
   * @returns ParsedIncomingEvent if status changed (success/failure), null if still pending
   */
  async fetchStatus({ message_type, delivery_queue_id, device, phase, meter_interaction_id }: DeviceMessage): Promise<ParsedIncomingEvent | null> {
    // console.info(`[CALIN_V1_API STATUS CHECK] ${ message_type } for ${ device.external_reference }`);
    const _base = {
      delivery_queue_id,
      message_type,
      device,
    };

    const taskType = isReadInteraction(message_type) ? 'READ'
      : isControlInteraction(message_type) ? 'CONTROL'
        : isWriteInteraction(message_type) ? 'WRITE'
          : isTokenInteraction(message_type) ? 'TOKEN'
            : null;
    if(!taskType) return null;

    let res: CalinApiV1CommResponse;

    try {
      res = await sendCalinApiV1Request<CalinApiV1CommResponse>(TASK_PATH_MAP[taskType], {
        ...COMM_API_DATA,
        TaskNo: delivery_queue_id,
      });
    }
    catch(err) {
      return {
        ..._base,
        delivery_status: 'DELIVERY_FAILED',
        failure_context: {
          reason: 'Could not check task status because ' + err.message,
          errorCode: err.code,
        },
      };
    }

    // console.info('[V1 status check] response:', res);
    const _result = res?.Result;

    if(!_result) {
      if(res.ResultCode === '99') {
        // @TEMPORARY LOG to see if it's really about tokens
        console.info(`
          ===================================================================
          [CALIN_V1_API STATUS CHECK] Got a token rejected for meter interacion ${ meter_interaction_id } of type ${ message_type }
          ===================================================================
        `);
        return {
          ..._base,
          delivery_status: 'DELIVERY_FAILED',
          failure_context: {
            reason: 'The token was rejected, possibly already delivered.',
            errorCode: 99,
            skipRetry: true,
          },
        };
      }
      else {
        // We make this big log to see if this even happens..
        console.info(`
          ===================================================================
          [CALIN_V1_API STATUS CHECK] No result returned when fetching status
          ===================================================================
        `, res);
        return {
          ..._base,
          delivery_status: 'DELIVERY_FAILED',
          failure_context: {
            reason: res?.Reason ?? 'CALIN API V1 gave no status or data for this task',
          },
        };
      }
    }

    if(!_result.Status || _result.Status === 'unknown') return null;

    if(_result.Status === 'False') {
      // console.info('[CALIN_V1_API STATUS CHECK] result status was "False"', res);
      return {
        ..._base,
        delivery_status: 'DELIVERY_SUCCESSFUL',
        response: { status: 'EXECUTION_FAILURE' },
        failure_context: {
          reason: res.Reason !== 'OK' ? res.Reason : 'Delivery was successful but execution of the command failed',
        },
      };
    }

    if(_result.Status !== 'True') {
      console.warn('[CALIN_V1_API STATUS CHECK] Received response with unexpected status', _result);
      return null;
    }

    return {
      ..._base,
      delivery_status: 'DELIVERY_SUCCESSFUL',
      ...this.parseResponseData(_result, phase),
    };
  }

  private parseResponseData(
    fullResult: CalinApiV1CommResponse['Result'],
    requestedPhase?: PhaseEnum,
  ): {
    response: { status: MessageResponseStatus; data?: Json; };
    failure_context?: FailureContext;
  } {
    const { DataItem, Data } = fullResult;

    // Determine phase from response DataItem (or use requested phase)
    const responsePhase = DataItemToPhase[DataItem] ?? requestedPhase;

    switch(DataItem) {
      // READ_CREDIT
      case 'Current Credit Register': {
        if(isEmpty(Data)) {
          return createFailedResponseData('CALIN responded with an empty value');
        }
        const [ currentCredit, meterOnOff ] = Data.split(',');
        const kwh_credit_available = toSafeNumberOrNull(currentCredit);
        if(kwh_credit_available === null) {
          return createFailedResponseData(`CALIN responded with "${ Data }" while we were expecting kWh and relay status`);
        }
        return createSuccessfulResponseData({ kwh_credit_available, is_on: meterOnOff === 'ON' });
      }

      // READ_VOLTAGE
      case 'Voltage':
      case 'VoltageA':
      case 'VoltageB':
      case 'VoltageC': {
        const [ _voltage ] = Data.split(' ');
        const voltage = toSafeNumberOrNull(_voltage);
        if(voltage === null) {
          return createFailedResponseData(`CALIN responded with "${ Data }" while we were expecting a voltage number`);
        }
        return createSuccessfulResponseData({
          voltage,
          ...(responsePhase && { phase: responsePhase }),
        });
      }

      // READ_POWER
      case 'Power':
      // case 'PowerA':
      // case 'PowerB':
      // case 'PowerC':
      {
        const [ power ] = Data.split(' ');
        return createSuccessfulResponseData({
          power: toSafeNumberOrNull(power),
          ...(responsePhase && { phase: responsePhase }),
        });
      }

      // READ_CURRENT
      case 'Current':
      case 'CurrentA':
      case 'CurrentB':
      case 'CurrentC': {
        const [ current ] = Data.split(' ');
        return createSuccessfulResponseData({
          current: toSafeNumberOrNull(current),
          ...(responsePhase && { phase: responsePhase }),
        });
      }

      // READ_POWER_LIMIT
      case 'Maximum power threshold': {
        const [ powerLimit ] = Data.split(' ');
        return createSuccessfulResponseData({ power_limit: toSafeNumberOrNull(powerLimit) });
      }

      // READ_VERSION
      case 'Version': {
        return createSuccessfulResponseData({ version: Data });
      }

      // SET_DATE || READ_DATE
      case 'Date': {
        // Write
        if(!Data.length) return createSuccessfulResponseData({ date_accepted: true });

        // Read
        const [ _date, _weekday ] = Data.split(' ');
        const [ _year, _month, _day ] = _date.split('-');
        return createSuccessfulResponseData({
          year: toSafeNumberOrNull('20' + _year),
          month: toSafeNumberOrNull(_month),
          day: toSafeNumberOrNull(_day),
          // weekday: toSafeNumberOrNull(_weekday),
        });
      }

      // TURN_ON
      case 'Switch On': {
        return createSuccessfulResponseData({ turn_on_accepted: true });
      }
      // TURN_OFF
      case 'Switch Off': {
        return createSuccessfulResponseData({ turn_off_accepted: true });
      }
      // TOKEN DELIVERY
      case 'Token': {
        return createSuccessfulResponseData({ token_accepted: true });
      }

      // OTHER COMMANDS
      default: {
        // We know it was successful, but have no additional data (?) so just respond with success.
        console.warn('[CALIN_V1_API STATUS CHECK] Unknown command', fullResult);
        return createSuccessfulResponseData();
      }
    }
  }
}

const createSuccessfulResponseData = (data?: Json) => ({
  response: {
    status: 'EXECUTION_SUCCESS' as MessageResponseStatus,
    data,
  },
});

const createFailedResponseData = (reason: string) => ({
  response: {
    status: 'EXECUTION_FAILURE' as MessageResponseStatus,
  },
  failure_context: { reason },
});
