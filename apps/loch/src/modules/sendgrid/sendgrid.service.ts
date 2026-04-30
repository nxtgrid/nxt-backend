import { Injectable } from '@nestjs/common';
import { Notification } from '@core/modules/notifications/entities/notification.entity';
const sgMail = require('@sendgrid/mail');

@Injectable()
export class SendgridService {
  from: string = 'your-email@company.co';

  constructor() {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  }

  // not going to use a rate limiter yet, since the volume is not big enough to become a concern.
  async send(notification: Notification): Promise<string> {
    const message: any = this.produceMessage(notification);
    let externalReference;
    try {
      const res = await sgMail.send(message);
      externalReference = res[0].headers['x-message-id'];
    }
    catch (err) {
      console.error(err);
    }

    // going to always return an external reference
    return externalReference;
  }

  // NOTE: subject is defined in the sendgrid builder, and does not seem to be
  // a way to set it from here. WTF.
  // depending on the notification type it gives out the message object that the client expects
  produceMessage(notification: Notification) {
    const baseMessage = {
      to: notification.email,
      from: this.from,
      subject: notification.subject,
    };
    switch (notification.notification_type) {
      case 'INVITE':
      case 'PASSWORD_RESET':
      case 'SITE_SUBMISSION':
        return {
          ...baseMessage,
          html: notification.message,
        };
      case 'GRID_REVENUE':
        return {
          template_id: 'd-68f636c970444e2f965f637bf01b1f29', //todo: make dynamic
          personalizations: [
            {
              to: [
                {
                  email: notification.email,
                },
              ],
            },
          ],
          from: {
            email: this.from,
            name: 'NXT Grid',
          },
          dynamic_template_data: notification.notification_parameter?.parameters,
          trackingSettings: {
            clickTracking: {
              enable: true,
              enableText: false,
            },
            openTracking: {
              enable: true,
              substitutionTag: '%open-track%',
            },
            subscriptionTracking: {
              enable: false,
            },
          },
        };
      case 'AUTO_PAYOUT_GENRATION_REPORT':
        return {
          template_id: 'd-362f2cc6d3484da180724238b7b14fb1', //todo: make dynamic
          personalizations: [
            {
              to: [
                {
                  email: notification.email,
                },
              ],
            },
          ],
          from: {
            email: this.from,
            name: 'NXT Grid',
          },
          dynamic_template_data: notification.notification_parameter?.parameters,
          trackingSettings: {
            clickTracking: {
              enable: true,
              enableText: false,
            },
            openTracking: {
              enable: true,
              substitutionTag: '%open-track%',
            },
            subscriptionTracking: {
              enable: false,
            },
          },
        };
      default:
        return;
    }
  }
}
