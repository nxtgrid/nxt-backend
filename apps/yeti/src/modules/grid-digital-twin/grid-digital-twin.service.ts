import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import moment from 'moment';
import { isNil, partition } from 'ramda';
import { VictronService } from '@core/modules/victron/victron.service';
import { SupabaseService } from '@core/modules/supabase.module';
import { connect as mqttConnect, MqttClient, IClientPublishOptions } from 'mqtt';
import { inferBrokerIndexByVrmId } from '@helpers/third-party-service-helpers';
import { getMeasureTypeFromMqttTopic, isSafeMqttTopicArray, parseMqttMessageSafe } from './lib/mqtt-helpers';

const { VICTRON_USERNAME, VICTRON_PASSWORD } = process.env;
const MQQT_CHANNEL_KEEP_ALIVE_INTERVAL_MS = 55_000;

@Injectable()
export class GridDigitalTwinService implements OnModuleInit {
  private mqttBrokerMap: Record<string, {
    client: MqttClient;
    // One client can serve multiple grids
    vrmIds: string[];
  }> = {};

  private gridVrmDigitalTwinMap: Record<string, {
    id: number;
    is_three_phase_supported: boolean;
    is_hps_on: boolean;
    is_hps_on_updated_at: string;
    is_hps_on_threshold_kw: number;
    vrmData: {
      power_L1?: number;
      power_L2?: number;
      power_L3?: number;
    };
  }> = {};

  constructor(
    private readonly victronService: VictronService,
    private readonly supabaseService: SupabaseService,
  ) { }

  onModuleInit() {
    if (process.env.NXT_ENV !== 'production') return;
    this.initialise();
  }

  private async initialise() {
    const grids = await this.supabaseService.adminClient
      .from('grids')
      .select('id, is_three_phase_supported, is_hps_on, is_hps_on_updated_at, is_hps_on_threshold_kw, generation_external_gateway_id')
      .is('deleted_at', null)
      .eq('generation_external_system', 'VICTRON')
      .not('generation_external_gateway_id', 'is', null)
      .then(this.supabaseService.handleResponse)
    ;

    for (const grid of grids) {
      const { generation_external_gateway_id } = grid;
      if (!generation_external_gateway_id?.length) continue;

      this.gridVrmDigitalTwinMap[generation_external_gateway_id] = {
        ...grid,
        vrmData: {},
      };

      const brokerIndex = inferBrokerIndexByVrmId(generation_external_gateway_id);
      const existingBroker = this.mqttBrokerMap[brokerIndex];
      if(existingBroker) {
        existingBroker.vrmIds = [ ...existingBroker.vrmIds, generation_external_gateway_id ];
        continue;
      }

      const client = mqttConnect(`mqtts://mqtt${ brokerIndex }.victronenergy.com`, {
        port: 443,
        username: VICTRON_USERNAME,
        password: VICTRON_PASSWORD,
        rejectUnauthorized: false,
      });

      // Add broker to map of brokers
      this.mqttBrokerMap[brokerIndex] = {
        client,
        vrmIds: [ generation_external_gateway_id ],
      };

      client.on('connect', () => {
        client.subscribe(`N/${ generation_external_gateway_id }/system/0/Ac/ConsumptionOnOutput/+/Power`);
      });

      client.on('message', (topic, message) => {
        this.updateDigitalTwinIfNeeded(topic, message);
      });

      client.on('disconnect', () => {
        console.info('[MQTT] CLIENT DISCONNECTED, ID:', client.options.clientId);
      });

      client.on('reconnect', () => {
        console.info('[MQTT] CLIENT RECONNECTED, ID:', client.options.clientId);
      });

      client.on('offline', () => {
        console.info('[MQTT] CLIENT OFFLINE, ID:', client.options.clientId);
      });

      client.on('close', () => {
        console.info('[MQTT] CLIENT CLOSED, ID:', client.options.clientId);
      });

      client.on('error', console.error);
    }

    this.startKeepAlive();
  }

  private async updateDigitalTwinIfNeeded(topic: string, message: Buffer) {
    try {
      const topicArray = topic.split('/');
      if (!isSafeMqttTopicArray(topicArray)) return;

      const vrmId = topicArray[1];

      const payload = parseMqttMessageSafe(message);
      if (!payload) return;

      const measureType = getMeasureTypeFromMqttTopic(topic);
      if (!measureType) return;

      const digitalTwin = this.gridVrmDigitalTwinMap[vrmId];
      if (!digitalTwin) return;

      const updatedVrmData = {
        ...digitalTwin.vrmData,
        [ measureType ]: Number(payload.value) / 1000,
      };

      // Update the digital twin's VRM data
      this.gridVrmDigitalTwinMap[vrmId].vrmData = updatedVrmData;

      // For three phase grids, we need to have data about all three phases before updating its status
      if(digitalTwin.is_three_phase_supported && (
        isNil(updatedVrmData.power_L1) || isNil(updatedVrmData.power_L2) || isNil(updatedVrmData.power_L3)
      )) return;

      const totalPowerKw = updatedVrmData.power_L1 + (!digitalTwin.is_three_phase_supported ? 0 : (updatedVrmData.power_L2 + updatedVrmData.power_L3));
      const isHpsNowOn = totalPowerKw >= digitalTwin.is_hps_on_threshold_kw;

      if(isHpsNowOn === digitalTwin.is_hps_on) return;

      const toUpdate = {
        is_hps_on: isHpsNowOn,
        is_hps_on_updated_at: (new Date()).toISOString(),
      };

      console.info(`[GRID DIGITAL TWIN] Updating grid with ID ${ digitalTwin.id }, HPS is now ${ isHpsNowOn ? 'ON' : 'OFF' }.`);

      // Update the digital twin
      this.gridVrmDigitalTwinMap[vrmId] = {
        ...this.gridVrmDigitalTwinMap[vrmId],
        ...toUpdate,
      };

      // Update in database
      await this.supabaseService.adminClient
        .from('grids')
        .update(toUpdate)
        .eq('id', digitalTwin.id)
        .then(this.supabaseService.handleResponse)
      ;
    }
    catch (err) {
      console.error(err);
    }
  }


  /**
   * MQTT Keep alive
  **/

  private mqttKeepAliveInterval: NodeJS.Timeout;

  private startKeepAlive() {
    clearInterval(this.mqttKeepAliveInterval);
    const allBrokers = Object.values(this.mqttBrokerMap);

    this.mqttKeepAliveInterval = setInterval(() => {
      const [ connectedBrokers, disconnectedBrokers ] = partition(({ client }) => client.connected, allBrokers);
      connectedBrokers.forEach(this.sendKeepAliveToBroker);
      disconnectedBrokers.forEach(broker => {
        console.warn('[MQTT] Can\'t send keepAlive message because client is disconnected. Client gateway IDs:', broker.vrmIds);
      });
    }, MQQT_CHANNEL_KEEP_ALIVE_INTERVAL_MS);
  }

  private async sendKeepAliveToBroker(broker: { client: MqttClient; vrmIds: string[]; }) {
    for (const vrmId of broker.vrmIds) {
      const topic = `R/${ vrmId }/keepalive`;
      // We keep alive but do not republish all messages every time, to save lots of data
      const payload = JSON.stringify({ 'keepalive-options' : [ 'suppress-republish' ] });
      // Setting Quality of Service to 1 (acknowledged at least once) so we have guarantee our message reached the Cerbo
      const options: IClientPublishOptions = { qos: 1 };

      try {
        await broker.client.publishAsync(topic, payload, options);
      }
      catch (err) {
        console.warn(`[DIGITAL TWIN MQTT] Error with keepalive for gateway: ${ vrmId }`, err);
      }
    }
  }


  /**
   * Checking connectivity EVERY MINUTE, and updating grids' generation_gateway_last_seen_at
  **/

  isCheckingForGatewayConnectivity = false;

  // @TOCHECK :: Do we need to do this so often? Can we use MQTT for this perhaps?
  @Cron(CronExpression.EVERY_MINUTE, { disabled: process.env.NXT_ENV !== 'production' })
  async updateGridConnectivityStats() {
    if (this.isCheckingForGatewayConnectivity) return;
    this.isCheckingForGatewayConnectivity = true;

    const { adminClient: supabase, handleResponse } = this.supabaseService;

    try {
      const grids = await supabase
        .from('grids')
        .select('id, generation_external_site_id, generation_external_gateway_id, generation_gateway_last_seen_at, is_hps_on_threshold_kw')
        .is('deleted_at', null)
        .eq('generation_external_system', 'VICTRON')
        .not('generation_external_site_id', 'is', null)
        .not('generation_external_gateway_id', 'is', null)
        .then(handleResponse)
      ;

      for (const grid of grids) {
        /**
         * Update the grid digital twin with the threshold, just in case it changed
        **/
        const digitalTwin = this.gridVrmDigitalTwinMap[grid.generation_external_gateway_id];
        if(digitalTwin) digitalTwin.is_hps_on_threshold_kw = grid.is_hps_on_threshold_kw;

        /**
         * Update the generation_gateway_last_seen_at value in database based on the Cerbo's last connection timestamp
         * NOTE :: This is not really part of the digital twin but may be improved with MQTT
        **/
        const devices = await this.victronService.fetchDevices(grid.generation_external_site_id);

        // All devices have the same gateway (Cerbo), so just find the first
        const generationGateway = devices.find(({ identifier }) => identifier === grid.generation_external_gateway_id);
        const generationGatewayLastOnlineMoment = generationGateway ? moment.unix(generationGateway.lastConnection) : null;

        if (generationGatewayLastOnlineMoment && !generationGatewayLastOnlineMoment.isSame(grid.generation_gateway_last_seen_at)) {
          await supabase
            .from('grids')
            .update({ generation_gateway_last_seen_at: generationGatewayLastOnlineMoment.toISOString() })
            .eq('id', grid.id)
            .then(handleResponse)
          ;
        }
      }
    }
    catch (err) {
      console.error('[DIGITAL TWIN] Error checking grid.generation_gateway_last_seen_at', err);
    }
    finally {
      this.isCheckingForGatewayConnectivity = false;
    }
  }
}
