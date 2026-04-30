import { Notification } from '@core/modules/notifications/entities/notification.entity';
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { RateLimit } from 'async-sema';
import { v4 as uuidv4 } from 'uuid';
@Injectable()
export class TelegramService {
  telegramRateLimiter;

  constructor(
    private readonly httpService: HttpService,
  ) {
    this.telegramRateLimiter = RateLimit(1);
  }

  private buildUrl(notification: Notification) {
    switch (notification.connector_external_system) {
      case 'MAKE':
        return process.env.MAKE_API_URL;
      case 'FLOW_XO':
        return process.env.FLOW_XO_API;
      default: return null;
    }
  }

  private buildEndpoint(notification: Notification) {
    switch (notification.notification_type) {
      // in case of the notification revenue, we are forced to go through flow xo until we merge flow xo and make
      case 'GRID_REVENUE':
        return `/hooks/a/${ process.env.FLOW_XO_REVENUE_NOTIFICATION_WEBHOOK_ID }`;
      // otherwise we go through make
      default: return `/${ process.env.MAKE_API_TELEGRAM_NOTIFICATION_WEBHOOK_ID }`;
    }
  }

  async send(notification: Notification): Promise<string> {
    const url = this.buildUrl(notification);
    const endpoint = this.buildEndpoint(notification);

    if (!url || !endpoint) {
      console.error(`Could not send notification ${ notification.id } because could not identify correct url for ${ notification.connector_external_system } provider. Url is ${ url } and endpoint ${ endpoint }`);
      return;
    }

    await this.telegramRateLimiter(); //add to rate limiter

    const body = notification.connector_external_system === 'FLOW_XO' ?
      {
        message: notification.message,
        response_path: `${ process.env.FLOW_XO_REVENUE_NOTIFICATION_RESPONSE_PATH }/c/${ notification.chat_id }`,
        id: notification.id,
      } :
      {
        message: notification.message,
        chat_id: notification.chat_id,
        id: notification.id,
        thread_id: notification.thread_id,
      };

    const headers = notification.connector_external_system === 'FLOW_XO' ? {} : {
      'X-API-KEY' : process.env.MAKE_API_TOKEN,
    };

    await this.httpService
      .axiosRef
      .post(`${ url }${ endpoint }`, body, { headers });

    // Since the make.com driven flow does not return any reference, we return a temporary one. Make will update Tiamat once it's done with the operation
    return `${ uuidv4() }-temporary`;
  }
}
