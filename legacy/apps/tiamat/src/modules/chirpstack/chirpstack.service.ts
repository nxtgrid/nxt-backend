import moment from 'moment';
import { SupabaseService } from '@core/modules/supabase.module';
import { HttpService } from '@nestjs/axios';
import { HttpException, Injectable } from '@nestjs/common';
import { CreateOrderDto } from '../orders/dto/create-order.dto';

@Injectable()
export class ChirpStackService {
  constructor(
    private readonly httpService: HttpService,
    private readonly supabaseService: SupabaseService,
  ) {}

  // Processes incoming messages from acrel meters.
  // 1. It looks for the corresponding meter;
  // 2. It updates said meter;
  // 3. It sends a copy of the data to yeti, so it gets added to historical data recording
  async processIncomingLorawanMessageForAcrelProfile(body: any) {
    const { handleResponse, adminClient: supabase } = this.supabaseService;
    const externalReference = body.deviceInfo?.devEui;

    // Will throw already if no corresponding meter is not found
    const device = await supabase
      .from('devices')
      .select('*, meter:meters(*, wallet:wallets!meter_id(*), connections(*, customers(*, wallet:wallets(*))))')
      .eq('external_reference', externalReference)
      .single()
      .then(handleResponse); //TODO: there might be a poblem with this, since it's going to make the failure silent...

    if (!device.id) {
      console.error(`Could not find device with external reference ${ externalReference }. Returning...`);
      return;
    }

    // Add a log so we have a reference to original data
    await supabase
      .from('device_logs')
      .insert({
        device_id: device.id,
        message: JSON.stringify(body),
      })
      .then(handleResponse)
    ;

    // TODO: update the meter object

    // Update the device object
    await supabase
      .from('devices')
      .update({ values: body?.object?.data })
      .eq('external_reference', externalReference)
      .single()
      .then(handleResponse);

    const data = body.object.data;
    const toSendToYeti = {
      device_id: device.id,
      created_at: moment.utc(body.time), //The meter is sending time in the local timezone
      timestamp: moment.utc(body.time),
      data, //This is the structure specified at decoder level, so it's going to change for every device
      meta: {}, //TODO: add meta?
    };

    await this.checkForKwhAndProduceOrderIfNecessary(device.id, data);

    // Send a copy to yeti to insert into timescale
    this.httpService
      .axiosRef
      .post(`${ process.env.YETI_API }/device-data-sink/ingest`, toSendToYeti)
      .catch(err => {
        console.error('Error sending to Yeti', err);
      });
  }

  // Every time new data comes in, we check whether more than 30 mins have elapsed from the last update.
  // If that's the case, then we check whether the meter is postpaid. So, as energy is consumed, credit
  // is going to be removed from the customer wallet, and moved into the meter wallet, which is a leaf
  // wallet in our credit tree.
  async checkForKwhAndProduceOrderIfNecessary(deviceId: number, event: any) {
    // If the fields are not available, then skip the whole thing
    // TODO: check for the correct fields
    if (typeof event.EPa !== 'number') return;

    const { handleResponse, adminClient: supabase } = this.supabaseService;

    // TODO: add the check about whether the meter is a postpaid meter
    // For now, since all acrel meters are postpaid, we are not going to have any condition in place

    // Will throw already if no corresponding meter is not found
    const device = await supabase
      .from('devices')
      .select('*, meter:meters(*, wallet:wallets!meter_id(*), connection:connections(*, customer:customers(*, grid:grids(*), wallet:wallets(*))))')
      .eq('id', deviceId)
      .single()
      .then(handleResponse); //TODO: there might be a poblem with this, since it's going to make the failure silent...

    // TODO: isn't this supposed to work?
    const meter = device.meter;
    if(!meter) {
      console.error(`[CHIRPSTACK SERVICE] Trying to update meter for a device that doesn't have one. Id: ${ device.id }, external reference: ${ device.external_reference }`);
      return;
    }
    const thirtyMinsAgo = moment().subtract(30, 'minutes');

    // If the credit of the meter was updated last time more than 30 mins ago or is null
    if (!meter.pulse_counter_kwh_updated_at || moment(meter.pulse_counter_kwh_updated_at).isBefore(thirtyMinsAgo)) {
    // Find the wallet of the customer to send credit from
      const customerWalletId = meter.connection?.customer?.wallet?.id;
      // Find the wallet of the leaf meter to send credit to

      if (!customerWalletId) {
        console.error(`Could not find a customer wallet for meter with id ${ customerWalletId }. Returning...`);
        return;
      }

      // In order to find the amount, we fetch need to know the delta
      const oldPulseCounterKwh = meter.pulse_counter_kwh || 0; //If it's null, we mark it as zero
      const kwh = event.EPa - oldPulseCounterKwh;

      // Update the kwh counter
      await supabase
        .from('meters')
        .update({ pulse_counter_kwh_updated_at: moment().toISOString(), pulse_counter_kwh: event.EPa })
        .eq('id', meter.id);

      // TODO: determine exactly where the tariff is defined
      // If a meter has a specific tariff, then we are going to use that.
      // Otherwise we'll use the grid tariff
      let tariff; let amount;
      if (typeof meter.kwh_tariff == 'number') {
        tariff = meter.kwh_tariff;

        if (tariff !== 0) amount = kwh / tariff;
        else throw new HttpException(`Tariff for meter ${ meter.external_reference } is 0`, 500);
      }
      else {
        tariff = meter.connection.customer.grid.kwh_tariff_essential_service;
        amount = kwh / tariff;
      }

      // Find the
      const newOrder: CreateOrderDto = {
        sender_wallet_id: customerWalletId,
        receiver_wallet_id: meter.wallet.id,
        payment_channel: null,
        amount: amount,
        currency: 'NGN',
        order_status: 'INITIALISED',
      };

      console.info('Created order via prepostpaid');
      console.info(newOrder);
    // // The order service will take care of processing it automatically
    // await this.orderService.create(newOrder);
    }
  }

  // Processes incoming messages from acrel meters.
  // 1. It looks for the corresponding meter;
  // 2. It updates said meter;
  // 3. It sends a copy of the data to yeti, so it gets added to historical data recording
  async processIncomingLorawanMessageForMilesightProfile(body: any) {
    const { handleResponse, adminClient: supabase } = this.supabaseService;
    const externalReference = body.deviceInfo?.devEui;

    // Will throw already if no corresponding meter is not found
    const device = await supabase
      .from('devices')
      .select()
      .eq('external_reference', externalReference)
      .single()
      .then(handleResponse);

    // Add a log so we have a reference to original data
    await supabase
      .from('device_logs')
      .insert({
        device_id: device.id,
        message: JSON.stringify(body),
      })
      .then(handleResponse)
    ;

    const toSendToYeti = {
      device_id: device.id,
      created_at: moment.utc(body.time), //The meter is sending time in the local timezone
      timestamp: moment.utc(body.time),
      data: body.object, //This is the structure specified at decoder level, so it's going to change for every device
      meta: {}, //TODO: add meta?
    };

    // Send a copy to yeti to insert into timescale
    await this.httpService
      .axiosRef
      .post(`${ process.env.YETI_API }/device-data-sink/ingest`, toSendToYeti)
      .catch(err => {
        console.error('Error sending to Yeti', err);
      });

    return;
  }
}
