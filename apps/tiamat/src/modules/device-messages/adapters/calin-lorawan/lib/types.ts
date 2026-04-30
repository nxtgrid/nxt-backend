import { Json, MeterInteractionTypeEnum } from '@core/types/supabase-types';
import { FailureContext, MessageResponseStatus } from '@tiamat/modules/device-messages/lib/types';

export type GatewayInfoFromChirpStack = {
  gatewayId: string;
  snr: number;
  rssi: number;
}

export type LorawanCalinJoinEvent = {
  // Identifiers
  deduplicationId: string;

  // Device
  deviceInfo: {
    devEui: string;
  };
  devAddr: string;
}

export type LorawanCalinDownEvent = {
  // Identifiers
  queueItemId?: string;
  downlinkId: string;

  // Device
  deviceInfo: {
    devEui: string;
  };
}

export type LorawanCalinAckEvent = {
  // Identifiers
  queueItemId: string;
  deduplicationId: string;

  // Device
  deviceInfo: {
    devEui: string;
  }

  // Acknowlegement
  acknowledged: boolean;
}

export type LorawanCalinUpEvent = {
  // Identifiers
  deduplicationId: string;

  // Device
  deviceInfo: {
    devEui: string;
  };
  devAddr: string;

  // Gateway
  rxInfo: GatewayInfoFromChirpStack[],

  // Acknowlegement
  // confirmed: boolean; needed?

  // Response data
  data: string;
}

export type LorawanCalinEvent = LorawanCalinJoinEvent | LorawanCalinDownEvent | LorawanCalinAckEvent | LorawanCalinUpEvent;

export type DecodedLorawanCalinEvent = {
  status: MessageResponseStatus;
  data: Json;
  failure_context?: FailureContext;
  unsolicited_event_type?: MeterInteractionTypeEnum;
}

export enum CalinMetaBytes {
  HEADER_BYTE = 0x68,
  END_BYTE = 0x16
}

// 0F 超功率    power limit breached
// 24 电量用完  credit exhausted
// 26 强制拉闸  remote switched off
// 27 超电压    over voltage
// 2D 未激活    meter not activated
// 2E 窃电      tamper(cover lifted)
// 2F 低电压    (low voltage)
