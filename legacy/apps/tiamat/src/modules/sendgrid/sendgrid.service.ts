import { Injectable } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationStatusEnum } from '@core/types/supabase-types';
import { SupabaseService } from '@core/modules/supabase.module';

const sgMail = require('@sendgrid/mail');

@Injectable()
export class SendgridService {
  constructor(
    private readonly notificationService: NotificationsService,
    private readonly supabaseService: SupabaseService,
  ) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  }

  parseEvent(event: string): NotificationStatusEnum {
    switch (event) {
      case 'delivered':
        return 'SUCCESSFUL';
      case 'opened':
        return 'READ';
      default:
        console.info(`[Sendgrid service] marking notification as failed since it's state is ${ event }`);
        return 'FAILED';
    }
  }

  async processUpdate(updateWebhookEvent: any) {
    const externalReference = updateWebhookEvent.sg_message_id;
    // For some reason when we send the email from the client sendgrid does not return the full id
    // of the email, so we need to extract it ourselves.
    const extractedExternalReference = externalReference.split('.')[0];
    const notification = await this.supabaseService.adminClient
      .from('notifications')
      .select('id')
      .eq('external_reference', extractedExternalReference)
      .maybeSingle()
      .then(this.supabaseService.handleResponse)
    ;

    // We return so at least we always give a 200 response to sendgrid
    if (!notification) return;

    const notification_status = this.parseEvent(updateWebhookEvent.event);
    return this.notificationService.update({ id: notification.id, notification_status });
  }
}
