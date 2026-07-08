import { HttpService } from '@nestjs/axios';
import { Body, Controller, Post } from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';
import { FlutterwaveService } from './flutterwave.service';
import { LokiService } from '@core/modules/loki/loki.service';

@Controller()
export class FlutterwaveController {
  constructor(
    protected readonly httpService: HttpService,
    protected readonly flutterwaveService: FlutterwaveService,
    protected readonly orderService: OrdersService,
    protected readonly lokiService: LokiService,
  ) { }

  @Post('flutterwave/webhook')
  async webhook(@Body() body: { txRef?: string; data?: { tx_ref: string; } }) {
    const external_reference = body?.txRef || body?.data?.tx_ref;

    // this.lokiService.log('info', `Received notification in webhook for transaction ${ txRef }`, { service: 'flutterwave', body });
    // We don't await result and we catch any error here.
    // We simply return an empty object to FW with OK 200 response.
    // This so Flutterwave's retry mechanism isn't activated.
    // (We do manual verification instead)
    this.orderService
      .verifyFlutterwaveOrder({ external_reference })
      .catch(err => {
        console.error(`[FW WEBHOOK] Error after trying to verify transaction with tx ref ${ external_reference }:`, err.message);
      })
    ;

    return {};
  }
}
