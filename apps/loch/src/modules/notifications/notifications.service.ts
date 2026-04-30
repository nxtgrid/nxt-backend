import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { v4 as uuidv4 } from 'uuid';
import { CreateNotificationInput } from '@core/modules/notifications/dto/create-notification.input';
import { SendgridService } from '../sendgrid/sendgrid.service';
import { TelegramService } from '../telegram/telegram.service';
import { AfricastalkingService } from '../africastalking/africastalking.service';
import { partition } from 'ramda';
import { mapAsyncSequential } from '@helpers/promise-helpers';
import { Notification, NotificationStatusEnum } from '@core/types/supabase-types';
import { SupabaseService } from '@core/modules/supabase.module';
import { PgService } from '@core/modules/core-pg';
import { RAW_QUERIES, LockedNotification, LockNextPageParams, LockNextPageResult } from '@loch/queries';

@Injectable()
export class NotificationsService {
  isRunning = false;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly pgService: PgService,
    private readonly sendgridService: SendgridService,
    private readonly telegramService: TelegramService,
    private readonly africastalkingService: AfricastalkingService,
  ) {}

  async update(id: number, updateNotificationInput) {
    const { handleResponse, adminClient: supabase } = this.supabaseService;

    return supabase
      .from('notifications')
      .update(updateNotificationInput)
      .eq('id', id)
      .select(`*,
        grid:grids(id, name),
        organization:organizations(id, name)
      `)
      .then(handleResponse);
  }

  async create(notificationsToCreate: CreateNotificationInput[]): Promise<Notification[]> {
    const withStatus = notificationsToCreate.map(notification => {
      let phone: string = null;
      if (notification.phone) phone = notification.phone[0] !== '+' ? `+${ notification.phone }` : notification.phone;

      return {
        ...notification,
        phone,
        notification_status: 'PENDING' as NotificationStatusEnum,
      };
    });

    const { handleResponse, adminClient: supabase } = this.supabaseService;
    const insertedNotifications = await supabase
      .from('notifications')
      .insert(withStatus)
      .select('*')
      .then(handleResponse);

    this.run(); // Attempt to run the queue as early as possible, but do not wait for them
    return insertedNotifications;
  }

  @Cron(CronExpression.EVERY_MINUTE, { disabled: process.env.NXT_ENV !== 'production' })
  async run() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const size = 100;
      let pendingNotifications: LockedNotification[];

      do {
        // locking all pending notifications and marking them as processing
        pendingNotifications = await this.lockNextPage(uuidv4(), size);
        await this.process(pendingNotifications);
      } while (pendingNotifications.length > 0);
    }
    catch (error) {
      console.error(error);
    }
    finally {
      this.isRunning = false;
    }
  }

  async process(pendingNotifications: LockedNotification[]) {
    // Process telegram notifications
    const telegramNotifications = pendingNotifications
      .filter(notification => notification.carrier_external_system === 'TELEGRAM');

    // @TODO :: MAP_ASYNC_SEQUENTIAL_V2 try binding with options.context
    const { results: tgResults, errors: tgErrors } = await mapAsyncSequential(async notification => {
      return this.telegramService.send(notification);
    }, { returnWithInput: true })(telegramNotifications);

    // Process email notifications
    const emailNotifications = pendingNotifications
      .filter(notification => notification.carrier_external_system === 'SENDGRID');

    // @TODO :: MAP_ASYNC_SEQUENTIAL_V2 try binding with options.context
    const { results: emailResults, errors: emailErrors } = await mapAsyncSequential(async notification => {
      return this.sendgridService.send(notification);
    }, { returnWithInput: true })(emailNotifications);

    // Process sms notifications
    const smsNotifications = pendingNotifications
      .filter(notification => notification.carrier_external_system === 'AFRICASTALKING');

    // @TODO :: MAP_ASYNC_SEQUENTIAL_V2 try binding with options.context
    const { results: smsResults, errors: smsErrors } = await mapAsyncSequential(async notification => {
      return this.africastalkingService.send(notification);
    }, { returnWithInput: true })(smsNotifications);

    // Now that we processed all requests, we flatten the results into successes and failures.
    // The differentiator is the existence of an external_reference field.

    // First we get all the errors from the calls (they got called in the mapAsyncSequential)
    const notificationsToMarkAsfailed = [ ...tgErrors, ...emailErrors, ...smsErrors ]
      .map(err => ({
        id: err.input.id,
        external_reference: err.input.external_reference,
        notification_status: 'FAILED' as NotificationStatusEnum,
      }));

    // We merge all the failures
    const asyncResults = [ ...tgResults, ...emailResults, ...smsResults ];

    // Even if some requests did not fail, we cannot be sure that they were successful. In order
    // to check that, we use the external_reference field.
    const [ successes, failures ] = partition(success => success.result, asyncResults);
    const toMarkAsFailedAfterResult = failures.map(({ input }) => ({
      id: input.id,
      external_reference: input.external_reference,
      notification_status: 'FAILED' as NotificationStatusEnum,
    }));

    const toMarkAsSuccessAfterResult = successes.map(({ input, result }) => ({
      id: input.id,
      external_reference: result,
      notification_status: 'RECEIVED_BY_API' as NotificationStatusEnum }));

    const { handleResponse, adminClient: supabase } = this.supabaseService;

    const notificationsToUpdate = [ ...notificationsToMarkAsfailed, ...toMarkAsFailedAfterResult, ...toMarkAsSuccessAfterResult ];

    const updatedNotifications = await Promise.all(notificationsToUpdate.map(notification => {
      return supabase
        .from('notifications')
        .update({
          notification_status: notification.notification_status,
          external_reference: notification.external_reference,
        })
        .eq('id', notification.id)
        .select()
        .single()
        .then(handleResponse);
    }));

    return updatedNotifications;
  }

  async lockNextPage(lockSession: string, limit: number): Promise<LockedNotification[]> {
    const params: LockNextPageParams = [
      lockSession,
      'PENDING',
      limit,
    ];
    await this.pgService.query<LockNextPageResult>(
      RAW_QUERIES.sql.supabase.notifications.lockNextPage,
      params,
    );

    const locked = await this.supabaseService.adminClient
      .from('notifications')
      .select(`
        id,
        carrier_external_system,
        connector_external_system,
        notification_type,
        lock_session,
        notification_status,
        external_reference,
        created_at
      `)
      .eq('lock_session', lockSession)
      .then(this.supabaseService.handleResponse)
    ;

    console.info('======== OUT OF CURIOSITY ========');
    console.info('LOCKED', locked);
    return locked;
  }
}
