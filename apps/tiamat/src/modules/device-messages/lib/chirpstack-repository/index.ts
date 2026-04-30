import { Metadata, credentials } from '@grpc/grpc-js';
import { DeviceServiceClient } from '@chirpstack/chirpstack-api/api/device_grpc_pb';
// const gateway_grpc = require('@chirpstack/chirpstack-api/api/gateway_grpc_pb');
import {
  CreateDeviceKeysRequest,
  CreateDeviceRequest,
  Device,
  DeviceKeys,
  DeviceQueueItem,
  EnqueueDeviceQueueItemRequest,
  GetDeviceQueueItemsRequest,
} from '@chirpstack/chirpstack-api/api/device_pb';

const {
  CHIRPSTACK_API_URL,
  CHIRPSTACK_API_TOKEN,
  CHIRPSTACK_APPLICATION_ID,
  CHIRPSTACK_PROFILE_ID,
  CHIRPSTACK_APP_KEY,
} = process.env;

const metadata = new Metadata();
metadata.set('authorization', `Bearer ${ CHIRPSTACK_API_TOKEN }`);

const chirpStackDeviceClient = new DeviceServiceClient(
  CHIRPSTACK_API_URL,
  credentials.createInsecure(),
);

export const chirpStackRepo = {
  enqueueDeviceRequest(devEui: string, bytes: number[]): Promise<string> {
    const queueItem = new DeviceQueueItem();
    queueItem.setDevEui(devEui);
    queueItem.setFPort(1); // We only use one port for now
    queueItem.setConfirmed(true); // Ask to send an ACK that the message has been received by the meter
    queueItem.setData(Uint8Array.from(bytes));

    const enqueueReq = new EnqueueDeviceQueueItemRequest();
    enqueueReq.setQueueItem(queueItem);

    return new Promise((resolve, reject) => {
      chirpStackDeviceClient.enqueue(enqueueReq, metadata, (err, res) => {
        if (err) return reject(err);
        return resolve(res.getId());
      });
    });
  },

  registerDevice(devEui: string, deviceName: string): Promise<{ is_new_registration: boolean }> {
    const device = new Device();
    device.setDevEui(devEui);
    device.setName(deviceName);

    // @TODO :: This is meter specific..
    device.setApplicationId(CHIRPSTACK_APPLICATION_ID);
    device.setDeviceProfileId(CHIRPSTACK_PROFILE_ID);

    const createDeviceRequest = new CreateDeviceRequest();
    createDeviceRequest.setDevice(device);

    return new Promise(resolve => {
      chirpStackDeviceClient.create(createDeviceRequest, metadata, err => {
        if(err) {
          console.info('[CHIRPSTACK REPO] Could not add device because', err.details);
          // Always resolve, because if a meter already exists we still want to continue
          return resolve({ is_new_registration: false });
        }
        return resolve({ is_new_registration: true });
      });
    });
  },

  generateApplicationKeyForDevice(devEui: string): Promise<{ success: boolean }> {
    const deviceKeys = new DeviceKeys();
    deviceKeys.setDevEui(devEui);
    deviceKeys.setNwkKey(CHIRPSTACK_APP_KEY);

    const createDeviceKeysRequest = new CreateDeviceKeysRequest();
    createDeviceKeysRequest.setDeviceKeys(deviceKeys);

    return new Promise(resolve => {
      chirpStackDeviceClient.createKeys(createDeviceKeysRequest, metadata, err => {
        if(err) {
          console.error('[CHIRPSTACK REPO] Error generating application key for device', devEui, err);
          resolve({ success: false });
        }
        resolve({ success: true });
      });
    });
  },

  getDeviceQueue(devEui: string): Promise<{ delivery_queue_id: string; }[]> {
    const request = new GetDeviceQueueItemsRequest();
    // GetDeviceQueueItemsResponse
    request.setDevEui(devEui);

    return new Promise((resolve, reject) => {
      chirpStackDeviceClient.getQueue(request, metadata, (err, res) => {
        if (err) return reject(err);
        const deviceQueueItems = res.getResultList();
        const parsedItems = deviceQueueItems.map(item => {
          const delivery_queue_id = item.getId();
          return { delivery_queue_id };
        });
        return resolve(parsedItems);
      });
    });
  },
};
