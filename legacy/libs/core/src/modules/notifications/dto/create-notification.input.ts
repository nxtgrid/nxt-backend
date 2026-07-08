import { ExternalSystemEnum, NotificationTypeEnum } from '@core/types/supabase-types';

export class CreateNotificationInput {
  carrier_external_system: ExternalSystemEnum;
  connector_external_system?: ExternalSystemEnum;
  notification_type: NotificationTypeEnum;
  external_reference?: string;
  grid_id?: number;
  account_id?: number;
  organization_id?: number;

  // common
  message?: string;

  // im platforms (telegram/whatsapp)
  chat_id?: string;
  thread_id?: string;

  // email
  email?: string;
  subject?: string;
  notification_parameter_id?: number;

  // sms
  phone?: string;
}
