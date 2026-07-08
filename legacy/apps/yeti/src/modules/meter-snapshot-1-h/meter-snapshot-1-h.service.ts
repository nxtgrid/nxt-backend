import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { chunkifyArray } from '@helpers/array-helpers';
import moment from 'moment-timezone';

import { Meter } from '@core/modules/meters/entities/meter.entity';
import { MeterSnapshot1H } from '@timeseries/entities/meter-snapshot-1-h.entity';
import { UpdateMeterInput } from '@core/modules/meters/dto/update-meter.input';
import { HttpService } from '@nestjs/axios';
import { DataSource, IsNull, Not, Repository } from 'typeorm';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { IssuesService } from '@core/modules/issues/issues.service';
import { Grid } from '@core/modules/grids/entities/grid.entity';
import { GridsService } from '@core/modules/grids/grids.service';
import { CalinService } from '../calin/calin.service';
import { mapAsyncSequential } from '@helpers/promise-helpers';
import { LokiService } from '@core/modules/loki/loki.service';
import { SupabaseService } from '@core/modules/supabase.module';
import { toSafeNumberOrZero } from '@helpers/number-helpers';

@Injectable()
export class MeterSnapshot1HService {
  isConsumptionLoopRunning = false;
  isPowerLimitLoopRunning = false;

  constructor(
    @InjectDataSource('timescale')
    protected readonly timescale: DataSource,
    @InjectRepository(Meter)
    public readonly meterRepository: Repository<Meter>,
    protected readonly calinService: CalinService,
    protected readonly issuesService: IssuesService,
    protected readonly gridsService: GridsService,
    protected readonly httpService: HttpService,
    private readonly lokiService: LokiService,
    private readonly supabaseService: SupabaseService,
  ) { }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { disabled: process.env.NXT_ENV !== 'production' })
  async create() {
    if (this.isConsumptionLoopRunning) return;
    this.isConsumptionLoopRunning = true;

    try {
      console.info('[MeterSnapshot1H] Running consumption sync');
      // Fetch the pending status for the meter datapoint tasks
      let meters: Meter[] = [];
      let page = 0;
      // Need to set 30 here as it's a Calin limit
      const limit = 30;

      do {
        try {
          // TODO: this is hard to turn into a supabase query, because type instantiation is too deep.
          meters = await this.meterRepository.find({
            where: {
              external_system: 'CALIN',
              connection: {
                customer: {
                  grid: {
                    is_automatic_meter_energy_consumption_data_sync_enabled: true,
                    timezone: Not(IsNull()),
                  },
                },
              },
            },
            relations: {
              dcu: {
                grid: true,
              },
              connection: {
                customer: {
                  account: true,
                  grid: true,
                },
              },
            },
            skip: page++ * limit,
            take: limit,
          });
          if(!meters.length) break;
          await this.attemptConsumptionDownloadByMeters(meters);
        }
        catch(error) {
          console.error('[MeterSnapshot1H] Error while downloading consumption data from Calin', error);
        }
      } while (meters.length > 0);
    }
    catch (err) {
      console.error('[MeterSnapshot1H] Outer consumption loop error (???)', err);
    }
    finally {
      this.isConsumptionLoopRunning = false;
      console.info('[MeterSnapshot1H] finished sync');
    }
  }

  async attemptConsumptionDownloadByMeters(meters: Meter[]): Promise<void> {
    const { adminClient: supabase, handleResponse } = this.supabaseService;
    const consumptionDatapoints: MeterSnapshot1H[] = [];
    const nonZeroConumptions: UpdateMeterInput[] = [];
    const issuesToRecalculateForMeterIds: number[] = [];

    const backTrackDays = 8;
    // We want to get until two days ago and not today because otherwise the last slot will be -1
    const twoDaysAgo = moment.utc({ hour: 0, minute: 0, second: 0, millisecond: 0 }).subtract(2, 'day');

    const dates: moment.Moment[] = [];
    for (let i = backTrackDays; i > 0; i--) {
      const pastDate = moment(twoDaysAgo).subtract(i, 'days');
      dates.push(pastDate);

      const datapoints: MeterSnapshot1H[] = await this.calinService.getConsumptionDataByMetersAndDate(meters, pastDate);
      consumptionDatapoints.push(...datapoints);

      const datapointsWithNonZeroConsumption = datapoints.filter(datapoint => datapoint.consumption_kwh > 0);

      // Recalculate issues
      const recalculateIssuesForMeterIds = datapointsWithNonZeroConsumption.map(datapoint => datapoint.meter_id);
      issuesToRecalculateForMeterIds.push(...recalculateIssuesForMeterIds);

      // Update the meters in logic db
      nonZeroConumptions.push(...datapointsWithNonZeroConsumption.map(datapoint => ({ id: datapoint.meter_id, last_non_zero_consumption_at: datapoint.created_at })));
    }

    // Fetch the preexisting datapoints that already have information about the state of a meter at a given point in time.
    const preexistingDatapoints: any[] = await this.fetchPreexistingDatapointsByMeterIdsAndCreatedAt(meters.map(meter => meter.id), dates);

    // Using a hashmap to avoid having high complexity
    const preexistingDatapointsHashmap = preexistingDatapoints.reduce((acc, curr) => {
      acc[`${ curr.meter_id }-${ curr.created_at }`] = curr;
      return acc;
    }, {});

    const datapointsToUpdate: MeterSnapshot1H[] = consumptionDatapoints.map(datapoint => {
      let preexisting = preexistingDatapointsHashmap[`${ datapoint.meter_id }-${ datapoint.created_at }`];

      // If we found a corresponding point that was already existing, update that datapoint. Otherwise use
      // the new datapoint just found in this iteration.
      if (!preexisting) preexisting = datapoint;

      // If the power limit is 0.2kW, then it means that it's HPS mode
      if (preexisting.power_limit_kw === 0.2) {
        preexisting.is_hps_consumption = true;
        preexisting.is_fs_consumption = null;
      }
      else {
        if (datapoint.consumption_kwh >= toSafeNumberOrZero(preexisting.power_limit_kw)) {
          preexisting.is_hps_consumption = null;
          preexisting.is_fs_consumption = true;
        }
        else {
          preexisting.is_hps_consumption = true;
          preexisting.is_fs_consumption = true;
        }
      }

      return preexisting;
    });

    // Once we have gone through all meters in this call, then we determine what
    const metersToUpdate: { id: number; last_non_zero_consumption_at: Date }[] = nonZeroConumptions.reduce((arr, curr) => {
      const index = arr.findIndex(update => update.id === curr.id);
      // if a meter update for the same meter already exists, then check
      // if that datapoint is more recent. If it is, remove the old datapoint
      // and add the new one
      if (index !== -1 && moment(curr.last_non_zero_consumption_at).isAfter(moment(arr[index].last_non_zero_consumption_at))) {
        arr.splice(index, 1);
        arr.push({ id: curr.id, last_non_zero_consumption_at: curr.last_non_zero_consumption_at });
      }
      else {
        arr.push({
          id: curr.id,
          last_non_zero_consumption_at: curr.last_non_zero_consumption_at,
        });
      }

      return arr;
    }, []);

    const uniqueMeterIdsToRecalculate: number[] = Array.from(new Set(issuesToRecalculateForMeterIds));

    const chunks = chunkifyArray(datapointsToUpdate, 1000);
    mapAsyncSequential(this.insertMeterDatapointsIntoTimescale.bind(this))(chunks);

    for(const { id, last_non_zero_consumption_at } of metersToUpdate) {
      await supabase
        .from('meters')
        .update({
          last_non_zero_consumption_at: last_non_zero_consumption_at.toISOString(),
        })
        .eq('id', id)
        .then(handleResponse)
      ;
    }

    // This cannot be converted to a supabase query,
    // because there is extra logic in the service that needs to be executed.
    await this.httpService
      .axiosRef
      .post(`${ process.env.TIAMAT_API }/issues/recalculate`, uniqueMeterIdsToRecalculate)
      .catch(console.error)
    ;
  }

  async fetchPreexistingDatapointsByMeterIdsAndCreatedAt(meterIds: number[], dates: moment.Moment[]): Promise<any[]> {
    if (!meterIds.length) return [];

    const params = [ ...meterIds, ...dates.map(date => date.toDate()) ];

    // todo: refactor, it's horrible
    const meterQueryParams = [];
    for (let i = 1; i <= meterIds.length; i++) {
      meterQueryParams.push(i);
    }

    // todo: refactor, it's horrible
    const dateQueryParams = [];
    for (let i = 1; i <= dates.length; i++) {
      dateQueryParams.push(i);
    }

    const query = `select *
      from meter_snapshot_1_h
      where meter_id in (${ meterQueryParams.map(index => `$${ index }`).join(',') })
      and created_at in (${ dateQueryParams.map(index => `$${ index + meterIds.length }`).join(',') })`;

    return this.timescale.query(query, params);
  }

  async insertMeterDatapointsIntoTimescale(meterDatapoints: MeterSnapshot1H[]) {
    return this.timescale.createQueryBuilder()
      .insert()
      .into(MeterSnapshot1H)
      .values(meterDatapoints)
      .orUpdate(
        [ 'consumption_kwh', 'is_fs_consumption', 'is_hps_consumption' ],
        [ 'created_at', 'meter_id' ],
      )
      .execute();
  }

  // Looks at the state of power limits and on/off in logic db and makes a copy into timeseries database
  // in order to support autopilot.
  @Cron(CronExpression.EVERY_HOUR, { disabled: process.env.NXT_ENV !== 'production' })
  async trackPowerLimitsAndState() {
    if (this.isPowerLimitLoopRunning) return;
    this.isPowerLimitLoopRunning = true;

    try {
      // since this is running in a server, it's going to be in UTC, like the rest of data
      const beginningOfThisHour = moment()
        .minutes(0)
        .seconds(0)
        .milliseconds(0)
        .toDate();

      // TODO: not entirely sure this is the best way to go, since power limit tracking is not really related to
      // metering hardware. However, for now it will do.
      const grids: Grid[] = await this.gridsService.findByIsAutomaticMeterEnergyConsumptionSyncEnabled(true);

      for (const grid of grids) {
        let page = 0;
        const size = 100;
        let meters: Meter[] = [];
        do {

          // TODO: we could directly query for meters instead of doing the join in the code.
          meters = await this.meterRepository.find({
            // We only want to pull in meters that are not lorawan, since lorawan is handled in a completely different way
            where: {
              connection: { customer: { grid: { id: grid.id } } },
              communication_protocol: Not('CALIN_LORAWAN'),
            },
            relations: {
              dcu: true,
              connection: {
                customer: {
                  account: true,
                },
              },
            },
            skip: size * page++,
            take: size,
          });

          const datapoints: MeterSnapshot1H[] = [];
          // TODO: can probably make this more succint
          if (grid.uses_dual_meter_setup) {
            // if the grid is using dual meter set up translate
            // HPS -> 200W
            // FS -> 0W (no power limit)
            const dualMeterGridDatapoints = meters.map(meter => {
              let powerLimitShouldbe;

              if (meter.meter_type === 'HPS') powerLimitShouldbe = 200;
              else powerLimitShouldbe = grid.should_fs_be_on ? 0 : 200;

              return {
                meter_id: meter.id,
                grid_id: grid.id,
                grid_name: grid.name,
                created_at: beginningOfThisHour,
                meter_type: meter.meter_type,
                organization_name: grid.organization.name,
                meter_phase: meter.meter_phase,
                customer_full_name: meter.connection.customer.account?.full_name,
                customer_id: meter.connection.customer.id,
                meter_external_reference: meter.external_reference,
                dcu_external_reference: meter.dcu.external_reference,
                dcu_external_system: meter.dcu.external_system,
                meter_external_system: meter.external_system,
                organization_id: grid.organization.id,
                dcu_id: meter.dcu.id,
                power_limit_kw: meter.meter_type === 'FS' ? 0 : 200 / 1000, // need to convert to kw
                power_limit_kw_should_be: powerLimitShouldbe / 1000, // need to convert to kw
                is_on: meter.is_on,
                should_be_on: meter.should_be_on,
                connection_id: meter.connection?.id,
                is_hidden_from_reporting: meter.connection?.customer?.is_hidden_from_reporting,
                is_cabin_meter: meter.is_cabin_meter,
              };
            });
            datapoints.push(...dualMeterGridDatapoints);
          }
          else {
            // if the grid is in single meter mode, then simply copy
            // the power limit set and the power limit that it should be
            const singleMeterGridDatapoints = meters.map(meter => ({
              created_at: beginningOfThisHour,
              meter_id: meter.id,
              grid_id: grid.id,
              meter_type: meter.meter_type,
              grid_name: grid.name,
              organization_name: grid.organization.name,
              meter_phase: meter.meter_phase,
              customer_full_name: meter.connection.customer.account?.full_name,
              customer_id: meter.connection.customer.id,
              meter_external_reference: meter.external_reference,
              dcu_external_reference: meter.dcu.external_reference,
              dcu_external_system: meter.dcu.external_system,
              meter_external_system: meter.external_system,
              organization_id: grid.organization.id,
              dcu_id: meter.dcu.id,
              power_limit_kw: meter.power_limit / 1000, //need to convert to kw
              power_limit_kw_should_be: meter.power_limit_should_be / 1000, //need to convert to kw
              is_on: meter.is_on,
              should_be_on: meter.should_be_on,
              connection_id: meter.connection?.id,
              is_hidden_from_reporting: meter.connection?.customer?.is_hidden_from_reporting,
              is_cabin_meter: meter.is_cabin_meter,

            }));
            datapoints.push(...singleMeterGridDatapoints);
          }

          const chunks = chunkifyArray(datapoints, 1000);
          await mapAsyncSequential(this.insertPowerLimitDatapoints.bind(this))(chunks);
        } while(meters.length);
      }
    }
    catch (err) {
      console.error('[MeterSnapshot1H] "Power limit and state" loop error', err);
    }
    finally {
      this.isPowerLimitLoopRunning = false;
    }
  }

  async insertPowerLimitDatapoints(chunk: MeterSnapshot1H[]) {
    return this.timescale.createQueryBuilder()
      .insert()
      .into(MeterSnapshot1H)
      .values(chunk)
      .orUpdate(
        [ 'power_limit_kw', 'power_limit_kw_should_be', 'is_on', 'should_be_on' ],
        [ 'created_at', 'meter_id' ],
      )
      .execute();
  }

  // This is used by LoRaWAN meters to send data hourly to the cloud. Data is received
  // by ChirpStack, which reroutes it to Tiamat. In turn Tiamat sends it here.
  // This function does not take into account single meter vs dual meter, since new
  // grids will always be single meter.
  async insertHourlyReadReport(datapoint: any) {
    const { adminClient: supabase, handleResponse } = this.supabaseService;
    const meter = await supabase
      .from('meters')
      .select(`*,
          dcu:dcus(id, external_reference, external_system),
          connection:connections(*,
          customer:customers(*,
            account:accounts(*),
            grid:grids(*,
              organization:organizations(*)
            )
        )
      )`)
      .eq('id', datapoint.meter_id)
      .single()
      .then(handleResponse);

    if (!meter) {
      this.lokiService.log('debug', `Yeti could not find meter when inserting read report data for meter with id ${ datapoint.meter_id }`, { error: datapoint });
      return;
    }

    if(!meter.connection?.customer?.account) {
      this.lokiService.log('debug', `Yeti could not find customer (via connection) for meter with id ${ datapoint.meter_id }`, { error: datapoint });
      return;
    }

    const { connection: { customer: { grid } } } = meter;

    if(!grid) {
      this.lokiService.log('debug', `Yeti could not find grid (via connection -> customer) for meter with id ${ datapoint.meter_id }`, { error: datapoint });
      return;
    }

    // The message contains a pulse counter, not the consumption for that given hour. This means that we need
    // to fetch the last available row and calculate the diff.

    const query = `select *
      from meter_snapshot_1_h
      where meter_id = $1
      order by created_at desc
      limit $2`;

    const rows = await this.timescale.query(query, [ meter.id, 1 ]);
    const reportedCounterKwh = Number(datapoint.counter_kwh);
    const reportedKWhAvailable = Number(datapoint.kwh_credit_available);

    // If there is a previous datapoint, then we do the math.
    // If there is no previous datapoint, then we do not calculate the consumption
    // and simply update the counter_kwh field, so by the next iteration, the
    // math will be executed as well, and we won't be reporting fake consumptions.
    let consumptionKWh;
    if (rows.length) {
      const previousDatapoint = rows[0];

      const previousCounterRead = Number(previousDatapoint.counter_kwh);
      if(typeof previousCounterRead === 'number') consumptionKWh = reportedCounterKwh - previousCounterRead;
    }

    const toBeInserted: MeterSnapshot1H = {
      created_at: moment(datapoint.created_at).toDate(), //from uplink
      meter_id: meter.id, //from db
      consumption_kwh: consumptionKWh, //derived from uplink
      counter_kwh: reportedCounterKwh, //derived from uplink
      kwh_credit_available: reportedKWhAvailable,
      grid_id: grid.id, //from db
      is_hidden_from_reporting: meter.connection.customer.is_hidden_from_reporting || meter.connection.customer.grid.is_hidden_from_reporting, //from db
      meter_type: meter.meter_type, //from db
      grid_name: grid.name, //from db
      organization_name: grid.organization.name, //from db
      meter_phase: meter.meter_phase, //from db
      customer_full_name: meter.connection.customer.account.full_name, //from db
      customer_id: meter.connection.customer.id, //from db
      meter_external_reference: meter.external_reference, //from db
      dcu_external_reference: meter.dcu.external_reference, //from db
      dcu_external_system: meter.dcu.external_system, //from db
      meter_external_system: meter.external_system, //from db
      organization_id: grid.organization.id, //from db
      dcu_id: meter.dcu.id, //from db
      power_limit_kw: meter.power_limit / 1000, //need to convert to kw
      power_limit_kw_should_be: meter.power_limit_should_be / 1000, //need to convert to kw
      is_on: meter.is_on,
      should_be_on: meter.should_be_on,
      is_cabin_meter: meter.is_cabin_meter,
      connection_id: meter.connection.id,
    };

    // Add extra metadata to datapoints, depending on the current status
    // of the meter object in logic db
    if (meter.power_limit === 200) {
      toBeInserted.is_hps_consumption = true;
      toBeInserted.is_fs_consumption = null;
    }
    else {
      if (toBeInserted.consumption_kwh >= toSafeNumberOrZero(meter.power_limit)) {
        toBeInserted.is_hps_consumption = null;
        toBeInserted.is_fs_consumption = true;
      }
      else {
        toBeInserted.is_hps_consumption = true;
        toBeInserted.is_fs_consumption = true;
      }
    }

    // No need to take into account last non-zero consumption or
    await this.insertMeterDatapointsIntoTimescale([ toBeInserted ]);
    return {};
  }
}
