import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { CreateNotificationInput } from '@core/modules/notifications/dto/create-notification.input';
import { UpdateNotificationInput } from '@core/modules/notifications/dto/update-notification.input';
import { Notification } from '@core/modules/notifications/entities/notification.entity';
import { NotificationStatusEnum } from '@core/types/supabase-types';
import { SupabaseService } from '@core/modules/supabase.module';

const parseWebhookStatus = (status: string): NotificationStatusEnum => {
  switch (status) {
    case 'Failed':
      return 'FAILED';
    case 'Success':
      return 'SUCCESSFUL';
    default:
      return 'UNKNOWN';
  }
};

@Injectable()
export class NotificationsService {
  constructor(
    private readonly httpService: HttpService,
    private readonly supabaseService: SupabaseService,
  ) { }
  async updateFromATWebhook({ id, status }: { id: string; status: string; }) {
    const { handleResponse, adminClient: supabase } = this.supabaseService;

    const notification = await supabase
      .from('notifications')
      .select('id')
      .eq('external_reference', id)
      .maybeSingle()
      .then(handleResponse)
    ;
    if (!notification) return;

    const parsedStatus = parseWebhookStatus(status);

    return supabase
      .from('notifications')
      .update({ notification_status: parsedStatus })
      .eq('id', notification.id)
      .then(handleResponse)
    ;
  }

  // @TOMMASO :: At some point we need to find out what the PUT operation
  // is used for to update notifications, so we can type this with a non-TypeORM type
  async update({ id, ...rest }: UpdateNotificationInput) {
    return this.supabaseService.adminClient
      .from('notifications')
      .update(rest)
      .eq('id', id)
      .select(`*,
        grid:grids(id, name),
        organization:organizations(id, name)
      `)
      .then(this.supabaseService.handleResponse)
    ;
    // todo: check if there is a better way of doing this. if we return the result
    // of the request immediately, then it gives a 500 error, so we need to declare
    // a separate var and return result.data
    // const { data } = await this.httpService
    //   .axiosRef
    //   .put(`${ process.env.LOCH_API }/notifications`, updateNotificationInput);
    // return data;
  }

  // @TOMMASO :: At some point we need to find out what the POST operation
  // is used for to update notifications, so we can type this with a non-TypeORM type
  async create(createNotificationInput: CreateNotificationInput[]): Promise<Notification[]> {
    // todo: check if there is a better way of doing this. if we return the result
    // of the request immediately, then it gives a 500 error, so we need to declare
    // a separate var and return result.data

    // HOTFIX: need to unify all calls to use an array
    let array = createNotificationInput;
    if (!Array.isArray(createNotificationInput))
      array = [ createNotificationInput ];

    const result = await this.httpService.axiosRef.post(`${ process.env.LOCH_API }/notifications`, array);
    return result.data;
  }
}
