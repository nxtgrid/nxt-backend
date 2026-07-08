import { Injectable, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import sgMail from '@sendgrid/mail';

@Injectable()
export class SoftwareDevAlertService implements OnModuleInit {
  constructor(
    protected readonly httpService: HttpService,
  ) {}

  onModuleInit() {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  }

  viaTelegram(message: string) {
    this.httpService.axiosRef
      .post(`${ process.env.MAKE_API_URL }/${ process.env.MAKE_API_SOFTWARE_DEV_ALERT_ID }`, { message })
      .catch(err => { console.error('Error sending alert via Telegram (Make.com)', err); })
    ;
  }

  viaMail({
    subject = '⚠️ Software Dev Alert ⚠️',
    message,
    to = 'software-team@your-company.co',
  }) {
    console.info('Not sending these emails');
    console.info(subject, message, to);
    sgMail.send({
      to,
      from: 'software-team@your-company.co',
      subject,
      html: `<pre>${ JSON.stringify(message) }</pre>`,
    });
  }
}
