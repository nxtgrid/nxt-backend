import { Injectable } from '@nestjs/common';
import { Grid } from '@core/modules/grids/entities/grid.entity';
import { GridsService } from '@core/modules/grids/grids.service';

import * as mqtt from 'mqtt';

const clients = [];
@Injectable()
export class MqttService {
  grids: any = [];

  constructor(
    protected readonly gridsService: GridsService,
  ) {
    // this.initialise();
  }

  async initialise() {
    const grids: Grid[] = await this.gridsService.findByIsHiddenFromReporting(false);
    for (const grid of grids) {
      if (typeof grid.generation_external_gateway_id != 'string') {
        continue;
      }

      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const self = this;
      this.grids.push({
        id: grid.id,
        name: grid.name,
        vrm_id: grid.generation_external_gateway_id,
        soc: undefined,
        timezone: grid.timezone,
      });

      //todo: add function to skip our broker and connect directly to vrm
      const string = this.getBrokerUrlByVrmId(grid.generation_external_gateway_id);

      let client = clients.find(client => client.options?.href === string);

      //if the client for that grid has already been created, no need to create a new client
      if(client) continue;

      client = mqtt.connect(string, {
        // port,
        // username,
        // password,
        // rejectUnauthorized: false,
      });

      client.on('connect', () => {
        client.subscribe('N/+/system/0/Dc/Battery/Soc', err => {
          if (!err) {
            // console.info('Subscribed to SOC updates');
          }
        });
      });

      client.on('message', (topic, message) => {
        self.storeSOC(topic, message);
      });

      client.on('disconnect', () => {
        console.info('Disconnected');
      });

      client.on('reconnect', () => {
        console.info('reconnect');
      });

      client.on('offline', () => {
        console.info('offline');
      });

      client.on('close', () => {
        console.info('close');
      });

      client.on('error', err => {
        console.error(err);
      });

      clients.push(client);
    }
  }

  storeSOC(topic, message) {
    try {
      // @TOMMASO-REFACTOR :: Why return sometimes false and sometimes undefined?
      if (!message.toString().length) return false;

      const packet = JSON.parse(message.toString());
      const array = topic.split('/');

      if (!Array.isArray(array) || array.length < 1) return;

      const grid = this.grids.find(({ vrm_id }) => vrm_id === array[1]);

      if (!grid) return;

      grid.soc = Number(packet.value) / 100;
    }
    catch (err) {
      console.info('' + message.toString());
      console.error(err);
    }
  }

  getSOCByGridId(gridId: number) {
    const grid = this.grids.find(({ id }) => id === gridId);
    if (!grid) return;

    return grid.soc;
  }


  // @REFACTOR :: Why do we have this twice? One in loch and one in tiamat..
  getBrokerUrlByVrmId(vrmId: string) {
    let sum = 0;
    for (let i = 0; i < vrmId.length; i++) {
      sum += vrmId.charCodeAt(i);
    }
    const broker_index = sum % 128;
    return `mqtts://mqtt${ broker_index }.victronenergy.com`;
  }
}
