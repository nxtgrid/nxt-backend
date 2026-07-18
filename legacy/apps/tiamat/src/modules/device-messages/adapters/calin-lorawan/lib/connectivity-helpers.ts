import { GatewayInfo } from '@tiamat/modules/device-messages/lib/types';
import { GatewayInfoFromChirpStack } from './types';

const _signalSortFn = (_a: GatewayInfoFromChirpStack, _b: GatewayInfoFromChirpStack) => {
  if (_b.snr !== _a.snr) {
    return _b.snr - _a.snr; // Prioritize higher SNR
  }
  return _b.rssi - _a.rssi; // Tie-breaker: higher RSSI (less negative)
};

export const selectGatewayWithBestSignal = (rxInfoList: GatewayInfoFromChirpStack[]): GatewayInfo => {
  // Sort by highest SNR first, then highest RSSI (less negative)
  const sorted = rxInfoList.sort(_signalSortFn);
  const best = sorted[0];
  return {
    external_reference: best.gatewayId,
    snr: best.snr,
    rssi: best.rssi,
  };
};
