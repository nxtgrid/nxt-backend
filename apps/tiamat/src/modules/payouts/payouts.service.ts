import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { pluckIdsFrom } from '@helpers/array-helpers';
import moment from 'moment-timezone';

// Entities
import { Payout } from '@core/modules/payouts/entities/payout.entity';
import { Grid } from '@core/modules/grids/entities/grid.entity';

// DTOs
import { CreatePayoutInput } from '@core/modules/payouts/dto/create-payout.input';
import { UpdatePayoutInput } from '@core/modules/payouts/dto/update-payout.input';
import { GeneratePayoutDto } from '@core/modules/payouts/dto/generate-payout.dto';

// Services
import { PayoutsService as CorePayoutsService } from '@core/modules/payouts/payouts.service';
import { GridsService } from '../grids/grids.service';
import { EnergyTrackingService } from '@core/modules/energy-tracking/energy-tracking.service';
import { RAW_QUERIES, MpptDailyUptime, MpptDailyUptimeParams, ExchangeRateSnapshotParams } from '@tiamat/queries';
import { SpendingService } from '@core/modules/spending/spending.service';
import { round } from '@helpers/number-helpers';
import { SupabaseService } from '@core/modules/supabase.module';

@Injectable()
export class PayoutsService extends CorePayoutsService {
  constructor(
    @InjectRepository(Payout)
    protected readonly payoutRepository: Repository<Payout>,
    private readonly gridsService: GridsService,
    protected readonly spendingService: SpendingService,
    protected readonly httpService: HttpService,
    @InjectDataSource('timescale')
    protected readonly timescale: DataSource,
    protected readonly energyTrackingService: EnergyTrackingService,
    private readonly supabaseService: SupabaseService,
  ) {
    super(payoutRepository);
  }

  async create(createPayoutInput: CreatePayoutInput[]) {
    const { identifiers } = await this.payoutRepository.insert(createPayoutInput);
    return this.findByIds(pluckIdsFrom(identifiers));
  }

  async update(id: number, updatePayoutInput: UpdatePayoutInput) {
    await this.payoutRepository.update(id, updatePayoutInput);
    const updatedPayout: Payout = await this.findOne(id);

    // todo: if the new state is an approval, then we also trigger then transaction
    // if (updatePayoutInput.payout_status === PayoutStatus.PROCESSING) {
    //   const res = await this.flutterwaveService.transfer({
    //     amount: updatedPayout.approved_amount,
    //     bankCode: updatedPayout.bank_account.account_number,
    //     bankAccountNumber: updatedPayout.bank_account.bank.external_id,
    //     currency: Currency.NGN, //todo: make parametric
    //     narration: 'Automatic disbursment',
    //     external_reference: updatedPayout.external_reference,
    //   });
    //   console.info(res);
    // }

    return updatedPayout;
  }

  // Fetching from database;
  async findExchangeRateByFromAndToAndDate(from: string, to: string, date: moment.Moment) {
    const params: ExchangeRateSnapshotParams = [ date.format('YYYY-MM-DD'), from, to ];
    const res = await this.timescale.query(
      RAW_QUERIES.sql.timescale.payouts.findExchangeRate,
      params,
    );

    if (!res.length) return null;
    return Number(res[0].value);
  }

  async generate({ grid_id, date_from, date_to }: GeneratePayoutDto) {
    const grid: Grid = await this.gridsService.findOne(grid_id);
    if (!grid) throw new NotFoundException(`Could draft report for unknown grid with id ${ grid_id }`);
    const start = moment(date_from);
    const end = moment(date_to);
    return this.runByGridAndStartAndEnd(grid, start, end);
  }

  async runByGridAndStartAndEnd(grid: Grid, start: moment.Moment, end: moment.Moment) {
    if (!grid) throw new HttpException('Grid is null when trying to draft payout for it', 500);

    const exchangeRate = await this.findExchangeRateByFromAndToAndDate('USD', 'NGN', end);
    if (typeof exchangeRate !== 'number') throw new HttpException(`ExchangeRate in payout draft for ${ grid } is not a number`,  500);

    return this.runByGridAndStartAndEndAndExhangeRate(grid, start, end, exchangeRate);
  }


  async runByGridAndStartAndEndAndExhangeRate(grid: Grid, start: moment.Moment, end: moment.Moment, exchangeRate: number) {
    if (!grid) throw new HttpException('Grid is null when trying to draft payout for it', 500);
    const { adminClient: supabase, handleResponse } = this.supabaseService;

    const energyTopupRevenue = await this.spendingService.findEnergyTopupRevenue(grid.id, { start, end });
    if (typeof energyTopupRevenue !== 'number') throw new HttpException(`Energy topup revenue in payout draft for ${ grid.name } is not a number`,  500);

    const connectionFeeRevenue = await this.spendingService.findConnectionFeeRevenue(grid.id, { start, end });
    if (typeof connectionFeeRevenue !== 'number') throw new HttpException(`Connection fee revenue in payout draft for ${ grid.name } is not a number`,  500);

    const roundedExchangeRate = round(exchangeRate, 1);
    const modsOnOffArray = await this.energyTrackingService.getActiveBatteryModules(grid.id, start, end);

    // an mppt not producing is not the same as an mppt being completely removed from vrm altogether. This means
    // that the mppts could still be present in the mppt list, but not in the timeseries data.
    const kwpModuleConsumptionsArray: any[] = await this.getMpptUptimeByGridId(grid.id, start, end);

    const activeConnections = await supabase
      .from('connections')
      .select(`
        meters!inner(id),
        customer:customers!inner(
          account:accounts!inner()
        )
      `)
      .eq('customer.grid_id', grid.id)
      .is('deleted_at', null)
      .is('customer.is_hidden_from_reporting', false)
      .is('customer.account.deleted_at', null)
      .then(handleResponse)
    ;


    const totalConnectionCount = activeConnections.length;
    const totalMeterCount = activeConnections.flatMap(({ meters }) => meters).length;
    let totalKWhDaysRented = 0;
    let totalKwpDaysRented = 0;
    let totalKwpRented = 0;

    const kwpDayArray: any = [];
    const kwpArray: any[] = [];

    for (const cc of kwpModuleConsumptionsArray) {
      // in this first part we only take into account the kwpdays
      const alreadyAddedToKwpDaysArray = kwpDayArray.find(arr => arr[0] === cc.mppt_external_reference);

      if (alreadyAddedToKwpDaysArray) {
        alreadyAddedToKwpDaysArray[2] = alreadyAddedToKwpDaysArray[2] + cc.is_active;
      }
      else {
        kwpDayArray.push( [ cc.mppt_external_reference, cc.mppt_kw, cc.is_active ]);
      }

      totalKwpDaysRented += cc.is_active * cc.mppt_kw;

      // in this second part we only take into account the kwp
      const alreadyAddedToKwpArray = kwpArray.find(({ mppt_external_reference }) => mppt_external_reference === cc.mppt_external_reference);

      if (!alreadyAddedToKwpArray) {
        totalKwpRented += cc.mppt_kw;
        kwpArray.push(cc);
      }
    }

    let totalKWhRented = 0;

    const kwhArray: any = modsOnOffArray.map(mod => {
      const modsOn = Number(mod.battery_modules_on_count);
      return [ moment(mod.bucket).format('YYYY-MM-DD'), modsOn, grid.kwh_per_battery_module  ];
    });

    totalKWhDaysRented = kwhArray
      .map(arr => arr[1] * arr[2])
      .reduce((acc, val) => acc + val, 0)
    ;

    totalKWhRented = Math.max(...kwhArray.map(arr => arr[1] * arr[2]));

    if (typeof totalConnectionCount !== 'number') throw new HttpException(`Could not draft payout for ${ grid.name } because totalConnectionCount is not a number`, 500);

    if (typeof totalMeterCount !== 'number') throw new HttpException(`Could not draft payout for ${ grid.name } because totalMeterCount is not a number`, 500);

    if (typeof energyTopupRevenue !== 'number') throw new HttpException(`Could not draft payout for ${ grid.name } because energyTopupRevenue is not a number`, 500);

    if (typeof connectionFeeRevenue !== 'number') throw new HttpException(`Could not draft payout for ${ grid.name } because connectionFeeRevenue is not a number`, 500);

    if (kwhArray.length < 1) throw new HttpException(`Could not draft payout for ${ grid.name } because kwhArray is not a number`, 500);

    if (typeof grid.kwh_per_battery_module !== 'number') throw new HttpException(`Could not draft payout for ${ grid.name } because kwh_per_battery_module is not a number`, 500);

    if (typeof totalKwpRented !== 'number') throw new HttpException(`Could not draft payout for ${ grid.name } because totalKwpRented is not a number`, 500);

    if (typeof totalKWhRented !== 'number') throw new HttpException(`Could not draft payout for ${ grid.name } because totalKWhRented is not a number`, 500);

    const dayCount = end.diff(start, 'day');
    const totalKwhAppliedRentalFee = round(totalKWhDaysRented / dayCount * grid.kwh_tariff * roundedExchangeRate, 3);
    const totalKwpAppliedRentalFee = round(totalKwpDaysRented / dayCount * grid.kwp_tariff * roundedExchangeRate, 3);
    const totalRental = totalKwhAppliedRentalFee + totalKwpAppliedRentalFee;
    const totalRevenue = connectionFeeRevenue + energyTopupRevenue;
    // revenue - rental - 10% - insurance (max #number of mppts installed per day and use that) for mppts and insurance for batteries (max #number of batteries installed per day and use that) - 1.4 fw fees
    const nxtGridFee = 0.1;
    const nxtGridAppliedFee = nxtGridFee * energyTopupRevenue; //support is only calculated on energy topups
    const fwFee = 0.02;
    const flutterwaveAppliedFee = fwFee * totalRevenue;
    const insuranceFee = 0.02;
    const insuranceAppliedFee = energyTopupRevenue * insuranceFee; //insurance is only calculated on energy topups
    const payout = totalRevenue - totalRental - nxtGridAppliedFee - insuranceAppliedFee - flutterwaveAppliedFee;

    const draftTemplate = {
      title: `${ grid.name } Tech Report Draft ${ start.format('YYYY-MM-DD') } through ${ end.format('YYYY-MM-DD') }`,
      total_rental: totalRental,
      connection_fee_revenue: connectionFeeRevenue,
      energy_topup_revenue: energyTopupRevenue,
      total_revenue: totalRevenue,
      grid_name: grid.name,
      kwp_fee: grid.kwp_tariff,
      kwh_fee: grid.kwh_tariff,
      payout: payout,
      start: start.tz(grid.timezone).format('YYYY-MM-DD HH:mm:ss'),
      end: end.tz(grid.timezone).format('YYYY-MM-DD HH:mm:ss'),
      day_count: dayCount,
      nxtgrid_fee: nxtGridFee,
      flutterwave_fee: fwFee,
      insurance_fee: insuranceFee,
      insurance_applied_fee: insuranceAppliedFee,
      nxtgrid_applied_fee: nxtGridAppliedFee,
      flutterwave_applied_fee: flutterwaveAppliedFee,
      exchange_rate: roundedExchangeRate,
      total_connection_count: totalConnectionCount,
      total_meter_count: totalMeterCount,
      total_kwh_rented: round(totalKWhDaysRented / dayCount, 3),
      total_kwp_rented: round(totalKwpDaysRented / dayCount, 3),
      total_kwh_rental_fee: totalKwhAppliedRentalFee,
      total_kwp_rental_fee: totalKwpAppliedRentalFee,
      mppts: JSON.stringify(kwpDayArray),
      battery_module_day_groups: JSON.stringify(kwhArray),
      grid_id: grid.id,
      payout_id: undefined,
    };

    const payoutToCreate: CreatePayoutInput = {
      started_at: start.toDate(),
      ended_at: end.toDate(),
      payout_status: 'WAITING_FOR_APPROVAL',
      proposed_amount: payout,
      external_system: 'FLUTTERWAVE',
      grid_id: grid.id,
      details: draftTemplate,
    };

    const [ createdPayout ] = await this.create([ payoutToCreate ]);
    if (!createdPayout) throw new HttpException('Could not create payout', 500);

    draftTemplate.payout_id = createdPayout.id;
    // create doc via make. This flow will in return call a webhook in tiamat, where
    // the google_sheet_draft_id will be recorded
    await this.httpService
      .axiosRef
      .post(`${ process.env.MAKE_API_URL }/${ process.env.MAKE_API_PAYOUT_FLOW_DRAFT_ID }`, draftTemplate, {
        headers: {
          'X-API-KEY' : process.env.MAKE_API_TOKEN,
        } })
      .then(({ data }) => data);

    return createdPayout;
  }

  async getMpptUptimeByGridId(gridId: number, start: moment.Moment, end: moment.Moment): Promise<MpptDailyUptime[]> {
    // in this query we do not query simply by grid id, but by mppt external reference following
    // the mppt_asset_snapshot_1_d table, because that table follows the screenshots of which
    // mppts were available in vrm (even if they were not producing) day by day.

    const params: MpptDailyUptimeParams = [
      start.format('YYYY-MM-DD HH:mm:ss'),
      end.format('YYYY-MM-DD HH:mm:ss'),
      gridId,
      start.format('YYYY-MM-DD HH:mm:ss'),
      end.format('YYYY-MM-DD HH:mm:ss'),
      gridId,
    ];
    return this.timescale.query(RAW_QUERIES.sql.timescale.payouts.getMpptUptimes, params);
  }
}
