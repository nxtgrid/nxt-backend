import { Body, Controller, Post } from '@nestjs/common';
import { SendgridService } from './sendgrid.service';

// @TODO :: Security
// More info at https://docs.sendgrid.com/for-developers/tracking-events/getting-started-event-webhook-security-features
@Controller('sendgrid')
export class SendgridController {

  constructor(
    private readonly sendgridService: SendgridService,
  ) { }

  // Used by sendgrid to notifiy us of the state of delivery of the email
  @Post('webhook')
  async updateNotification(@Body() body: any[]) {
    const event = body[0];

    if (!event) return;

    // We do not wait for the result to be picked up, but always reply with a 200 to sendgrid
    this.sendgridService.processUpdate(event);
    return {};
  }
}
