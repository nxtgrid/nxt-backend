import { Injectable } from '@nestjs/common';
import { isReadInteraction, isTokenInteraction, isControlInteraction, isWriteInteraction } from '@tiamat/modules/meter-interactions/lib/meter-interaction-type-helpers';
import { CalinApiV2DataItem, CalinApiV2TaskDataResponse, sendCalinApiV2Request } from './lib/repo';
import { DeviceMessage, MessageResponseStatus, ParsedIncomingEvent } from '../../lib/types';
import { Json } from '@core/types/supabase-types';
import { toSafeNumberOrNull } from '@helpers/number-helpers';

const TASK_PATH_MAP = {
  READ: '/API/RemoteMeterTask/GetReadingTask',
  CONTROL: '/API/RemoteMeterTask/GetControlTask',
  WRITE: '/API/RemoteMeterTask/GetSettingTask',
  TOKEN: '/API/RemoteMeterTask/GetTokenTask',
};

type TaskType = keyof typeof TASK_PATH_MAP;

/**
 * Incoming service for CALIN API V2 (PULL pattern).
 *
 * This adapter uses polling instead of webhooks. The `fetchStatus()` method
 * is called by the incoming service's polling cron to check task completion.
 */
@Injectable()
export class CalinApiV2IncomingService {
  /**
   * Fetch task status from CALIN API V2.
   * Called by the incoming service's polling cron for each message in the awaiting task queue.
   *
   * @param message - The message to check status for (contains delivery_queue_id = TaskNo)
   * @returns ParsedIncomingEvent if status changed (success/failure), null if still pending
   */
  async fetchStatus({ message_type, delivery_queue_id, device }: DeviceMessage): Promise<ParsedIncomingEvent | null> {
    // console.info(`[CALIN_V2_API STATUS CHECK] ${ message_type } for ${ device.external_reference }`);

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

    let res: CalinApiV2TaskDataResponse;

    try {
      res = await sendCalinApiV2Request<CalinApiV2TaskDataResponse>(TASK_PATH_MAP[taskType], {
        id: Number(delivery_queue_id),
        lang: 'en',
        company: process.env.CALIN_V2_COMPANY_NAME,
      });
    }
    catch(err) {
      // @TODO :: Revisit this
      console.error('[CALIN V2 INCOMING] Direct error in status check:', err);
      return {
        ..._base,
        delivery_status: 'DELIVERY_FAILED',
        failure_context: {
          reason: 'The CALIN API failed to respond',
        },
      };
    }

    const _result = res?.result?.data?.[0];

    if(!_result) {
      // We make this big log to see if this even happens..
      console.info(`
        ===================================================================
        [CALIN_V2_API STATUS CHECK] No result returned when fetching status
        ===================================================================
      `, res);
      return {
        ..._base,
        delivery_status: 'DELIVERY_FAILED',
        failure_context: {
          reason: res?.reason ?? 'CALIN API V2 gave no status or data for this task',
        },
      };
    }

    // Processing
    if(_result.status === 0) return null;

    // Success
    if(_result.status === 1) {
      return {
        ..._base,
        delivery_status: 'DELIVERY_SUCCESSFUL',
        ...this.parseResponseData(_result, taskType),
      };
    }

    // Failed / Rejected
    if(_result.status >= 2) {
      // console.info(`[CALIN_V2_API STATUS CHECK] FAILED :: Result status was "${ _result.status }"`, res);
      // console.info('  ...with data', _result);
      const reason = _result.status === 3 ? 'The token was rejected, possibly already delivered'
        : res.reason !== 'success' ? res.reason
          : 'Delivery was successful but execution of the command failed';
      return {
        ..._base,
        delivery_status: 'DELIVERY_SUCCESSFUL',
        response: { status: 'EXECUTION_FAILURE' },
        failure_context: {
          reason,
          // If the token was rejected, there's no use for retries
          skipRetry: _result.status === 3,
        },
      };
    }
  }

  private parseResponseData(result: CalinApiV2TaskDataResponse['result']['data'][0], taskType: TaskType): {
    response: { status: MessageResponseStatus; data?: Json; }
  } {
    const { name, data } = result;
    switch(name.trim() as CalinApiV2DataItem) {
      // READ_CREDIT
      case 'Current Credit Balance': {
        return createSuccessfulResponseData({
          kwh_credit_available: Number(data), // @TODO :: Check if needed
        });
      }
      // READ_VOLTAGE
      case 'Phase-A Voltage': {
        return createSuccessfulResponseData({
          voltage: Number(data),
        });
      }
      // READ_POWER
      case 'Power': {
        return createSuccessfulResponseData({
          power: Number(data),
        });
      }
      // READ_CURRENT
      case 'Phase-A Current(A)': {
        return createSuccessfulResponseData({
          current: Number(data),
        });
      }
      // READ_POWER_LIMIT
      case 'Maximum power threshold': {
        return createSuccessfulResponseData({
          power_limit: Number(data),
        });
      }
      // READ_VERSION
      case 'Meter Firmware Version': {
        return createSuccessfulResponseData({
          version: data,
        });
      }
      // TURN_ON || TURN_OFF
      case 'Relay On/Off': {
        const _toReturn = data === 'Connected' ? { turn_on_accepted: true } : { turn_off_accepted: true };
        return createSuccessfulResponseData(_toReturn);
      }
      // SET_DATE || READ_DATE
      case 'Clock(time)': {
        if(taskType === 'WRITE') return createSuccessfulResponseData({ date_accepted: true });

        // READ
        const [ _date, _time ] = (data as string).split(' ');
        const [ _year, _month, _day ] = _date.split('-');
        return createSuccessfulResponseData({
          year: toSafeNumberOrNull(_year),
          month: toSafeNumberOrNull(_month),
          day: toSafeNumberOrNull(_day),
        });
      }
      // TOKEN DELIVERY
      case 'Token': {
        return createSuccessfulResponseData({ token_accepted: true });
      }

      // OTHER COMMANDS
      default: {
        // We know it was successful, but have no additional data (?) so just respond with success.
        console.warn('[CALIN_V2_API STATUS CHECK] Unknown command', result);
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
