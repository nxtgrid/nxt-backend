import { Injectable } from '@nestjs/common';
import { Notification } from '@core/modules/notifications/entities/notification.entity';

const at = require('africastalking');

@Injectable()
export class AfricastalkingService {
  private atClient;

  constructor() {
    const AfricasTalkingClient = at({
      apiKey: process.env.AFRICASTALKING_API_KEY,
      username: process.env.AFRICASTALKING_USERNAME,
    });

    this.atClient = AfricasTalkingClient.SMS;
  }

  async send(sms: Notification): Promise<string> {
    if (typeof sms.message !== 'string')
      throw new Error('[AT SMS send] Message is not a string');

    if (!sms.phone)
      throw new Error('[AT SMS send] Please provide at least one phone number');

    const options = {
      from: process.env.AFRICASTALKING_SENDER_ID,
      to: [ sms.phone ],
      message: `[NXT Grid] ${ sms.message }`, //Adding branding as requested by AT
    };

    let smsResponse;
    try {
      smsResponse = await this.atClient.send(options);
    }
    catch (err) {
      console.error('[AT SMS send] Provider request failed', {
        notificationId: sms.id,
        phone: sms.phone,
        notificationType: sms.notification_type,
        errorMessage: err?.message,
        status: err?.response?.status,
        statusText: err?.response?.statusText,
        responseData: err?.response?.data,
      });
      throw err;
    }

    const recipients = smsResponse?.SMSMessageData?.Recipients;

    if(!Array.isArray(recipients) || recipients.length === 0) {
      console.error('[AT SMS send] Invalid provider response shape', {
        notificationId: sms.id,
        phone: sms.phone,
        notificationType: sms.notification_type,
        options,
        response: smsResponse,
      });
      throw new Error('[AT SMS send] No (valid) response from Africa\'s Talking');
    }

    return recipients[0].messageId;
  }
}
