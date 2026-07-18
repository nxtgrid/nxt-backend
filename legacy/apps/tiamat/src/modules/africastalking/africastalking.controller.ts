import { Body, Controller, Post, Header } from '@nestjs/common';
import { UssdSessionsService } from '@tiamat/modules/ussd-sessions/ussd-sessions.service';
import { NotificationsService } from '../notifications/notifications.service';

@Controller('africastalking')
export class AfricastalkingController {
  constructor(
    protected readonly ussdSessionsService: UssdSessionsService,
    protected readonly notificationsService: NotificationsService,
  ) { }

  @Post('webhook')
  @Header('Content-Type', 'text/plain')
  async webhook(@Body() body: {
    sessionId: string;
    text: string;
    phoneNumber: string;
    networkCode: string;
    serviceCode: string;
  }): Promise<string> {
    // @TOMMASO-REFACTOR :: Could this be a utility method with a good name that described what it's doing?
    const params = String(body.text).trim().split('*');
    const currentParam = params[params.length - 1];

    const ussdSessionHopDto = {
      phone: body.phoneNumber,
      text: currentParam,
      network_code: body.networkCode,
      service_code: body.serviceCode,
    };

    return this.ussdSessionsService.processNewUssdHop(body.sessionId, ussdSessionHopDto);
  }

  @Post('sms-delivery-report')
  @Header('Content-Type', 'text/plain')
  async smsNotificationStatus(@Body() body: { id: string; status: string; }): Promise<void> {
    // {
    //   phoneNumber: '+2348033793667',
    //   retryCount: '0',
    //   id: 'ATXid_f8da73a2f1d50a5600c7cbe0024565c7',
    //   status: 'Success',
    //   networkCode: '62130'
    // }
    // Do not wait for it to return, always return a 200 answer
    this.notificationsService.updateFromATWebhook(body);
    return;
  }
}

