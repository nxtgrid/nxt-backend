import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import moment, { Moment } from 'moment-timezone';
import { NotificationsService } from '../notifications/notifications.service';
import { SupabaseService } from '@core/modules/supabase.module';
import { ExternalSystemEnum, NotificationTypeEnum, Payout } from '@core/types/supabase-types';
import { NXT_ORG_ID } from '@core/constants';

const FRONTEND_BASE_URL = 'pegasus-frontend-url';

@Injectable()
export class PayoutsService {
  isPayoutCronRunning = false;

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly httpService: HttpService,
    private readonly supabaseService: SupabaseService,
  ) {}

  // Running at 5 AM UTC on the first day of every month
  @Cron('0 5 1 * *', { disabled: process.env.NXT_ENV !== 'production' })
  async run() {
    if (this.isPayoutCronRunning) return;
    this.isPayoutCronRunning = true;

    const { adminClient: supabase, handleResponse } = this.supabaseService;

    try {
      // Generate a payout for every grid. Once we have the list of all payouts,
      // create a notification to be sent to finance team, with links pointing to the payouts.
      const enabledGrids = await supabase
        .from('grids')
        .select('id, name, timezone')
        .is('deleted_at', null)
        .eq('is_hidden_from_reporting', false)
        .eq('is_automatic_payout_generation_enabled', true)
        .then(handleResponse)
      ;

      const payoutNotificationParameters = [];

      for(const { id, name, timezone } of enabledGrids) {
        try {
          const start = moment().tz(timezone).startOf('month').subtract(1, 'month');
          const end = moment().tz(timezone).startOf('month');
          const payout = await this.createPayout(id, start, end);

          await this.notifyXero(payout);

          payoutNotificationParameters.push({
            id: payout.id,
            grid_id: id,
            grid_name: name,
            link: `${ FRONTEND_BASE_URL }/grid/${ id }/financials/payouts/${ payout.id }`,
          });
        }
        catch(err) {
          console.error(`Failed to process payout for grid ${ id } (${ name }):`, err);
        }
      }

      // Create notification parameters
      const notificationParameter = await supabase
        .from('notification_parameters')
        .insert({ parameters: { payouts: payoutNotificationParameters } })
        .select('id')
        .single()
        .then(handleResponse)
      ;

      // Find NXT Grid finance members (Witek and Delcio)
      const financeMembers = await supabase
        .from('members')
        .select('...accounts(email)')
        .eq('member_type', 'FINANCE')
        .eq('account.organization_id', NXT_ORG_ID)
        .is('account.deleted_at', null)
        .then(handleResponse)
      ;

      // Queue notification to be send to finance members
      const emailsToSend = financeMembers.map(({ email }) => ({
        email,
        subject: 'Payout report',
        notification_parameter_id: notificationParameter.id,
        organization_id: NXT_ORG_ID,
        notification_type: 'AUTO_PAYOUT_GENRATION_REPORT' as NotificationTypeEnum,
        carrier_external_system: 'SENDGRID' as ExternalSystemEnum,
        connector_external_system: 'SENDGRID' as ExternalSystemEnum,
      }));

      await this.notificationsService.create(emailsToSend);
    }
    catch (error) {
      console.error(error);
    }
    finally {
      this.isPayoutCronRunning = false;
    }
  }

  async createPayout(grid_id: number, start: Moment, end: Moment) {
    // This call is going to create a payout
    const { data } = await this.httpService
      .axiosRef
      .post(`${ process.env.TIAMAT_API }/payouts`, {
        grid_id,
        date_from: start.toISOString(),
        date_to: end.toISOString(),
      }, {
        headers: {
          'X-API-KEY': process.env.TIAMAT_API_KEY,
        },
      });

    return data;
  }

  notifyXero(payout: Payout) {
    // title: `${ grid.name } Tech Report Draft ${ start.format('YYYY-MM-DD') } through ${ end.format('YYYY-MM-DD') }`,
    //   total_rental: totalRental,
    //   connection_fee_revenue: connectionFeeRevenue,
    //   energy_topup_revenue: energyTopupRevenue,
    //   total_revenue: totalRevenue,
    //   grid_name: grid.name,
    //   kwp_fee: grid.kwp_tariff,
    //   kwh_fee: grid.kwh_tariff,
    //   payout: payout,
    //   start: start.format('YYYY-MM-DD'),
    //   end: end.format('YYYY-MM-DD'),
    //   nxtgrid_fee: nxtGridFee,
    //   flutterwave_fee: fwFee,
    //   insurance_fee: insuranceFee,
    //   insurance_applied_fee: insuranceAppliedFee,
    //   nxtgrid_applied_fee: nxtGridAppliedFee,
    //   flutterwave_applied_fee: flutterwaveAppliedFee,
    //   exchange_rate: exchangeRate,
    //   total_connection_count: totalConnectionCount,
    //   total_meter_count: totalMeterCount,
    //   total_kwh_rented: totalKWhDaysRented,
    //   total_kwp_rented: totalKwpDaysRented,
    //   total_kwh_rental_fee: totalKwhAppliedRentalFee,
    //   total_kwp_rental_fee: totalKwpAppliedRentalFee,
    //   mppts: JSON.stringify(kwpDayArray),
    //   battery_module_day_groups: JSON.stringify(kwhArray),
    //   grid_id: grid.id,
    //   payout_id: undefined,
    const details = payout.details;
    return this.httpService
      .axiosRef
      .post(`${ process.env.MAKE_API_URL }/${ process.env.MAKE_API_XERO_AUTO_PAYOUT_FLOW_ID }`, {
        'grid_name': details.grid_name,
        'payout_id': payout.id,
        'start': payout.started_at,
        'kWh': details.total_kwh_rented,
        'kWp': details.total_kwp_rented,
        'storage_rental': details.total_kwh_rental_fee,
        'pv_rental': details.total_kwp_rental_fee,
        'payment_processing_fee': details.flutterwave_applied_fee,
        'insurance_fee': details.insurance_applied_fee,
        'nxt_gridsupport_fee': details.nxtgrid_applied_fee,
        'usd_to_ngn_rate': details.exchange_rate,
      });
  }
}
