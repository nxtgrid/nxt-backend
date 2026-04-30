import moment from 'moment-timezone';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { DataSource } from 'typeorm';
import { isNil, pipe, uniq, flatten, splitAt, reverse } from 'ramda';
import { round, toSafeNumberOrZero } from '@helpers/number-helpers';

import { Grid } from '@core/modules/grids/entities/grid.entity';
import { GridsService } from '@core/modules/grids/grids.service';
import { VictronService } from '@core/modules/victron/victron.service';
import { MeterTypeEnum } from '@core/types/supabase-types';

// @REFACTOR :: This service could benefit from typing

// constants
const BATTERY_EFFICIENCY = 0.95; //static param
const BATTERY_CAPACITY_KWH = 90; //static param

const SCORE_MULTIPLIER_FS_UPTIME = 1;
const SCORE_MULTIPLIER_HPS_UPTIME = 3;
const SCORE_MULTIPLIER_PV_CURTAILMENT = -5;
// todo: can only be used when the scoring system makes sense. We are not there yet (Feb 26th 2024).
const USE_COMPOSITE_SCORES = true;
// const CURRENT_HOUR = 10; //change at every iteration
// const CURRENT_MINUTE = 30; //change at every iteration
const MIN_CONSUMPTION_KWH_THRESHOLD = 0;
const MAX_CONSUMPTION_KWH_THRESHOLD = 5;

const SERIES_LENGTH = 48;
// const HOURS_ARRAY = [ 0,1,1,1,2,1,3,1,4,1,5,1,6,1,7,1,8,1,9,1,10,1,11,1,12,1,13,1,14,1,15,1,16,1,17,1,18,1,19,1,20,1,21,1,22,1,23,1 ];
const HPS_WEIGHT_ARRAY = [ 1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,3,3,3,3,3,3,3,3,2,2,2,2 ];
const FS_WEIGHT_ARRAY = [ 0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,1,1,1,1,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,2,2,2,2,2,2,2,2,1,1,1,1,0.5 ];

// todo:
// * show turn on/off effective HOUR
// * import solcast data for production forecast array -> done
// * import hps/fs consumption array (7 day average). we filter out negative readings and greater 5kWh/hour -> done
// * make it grid dependent (will probably need to have a param that says what grid we are dealing with) -> done
// * think of a way to plot hourly runs in a easy-to-debug way

// const INPUT_OBJECT = {
//   series_length: 48,
//   current_fs_state: 1,
//   initial_battery_kwh: 15,
//   hour_array:                [ 9, 1, 10, 1, 11, 1, 12, 1, 13, 1, 14, 1, 15, 1, 16, 1, 17, 1, 18, 1, 19, 1, 20, 1, 21, 1, 22, 1, 23, 1, 0, 1, 1, 1, 2, 1, 3, 1, 4, 1, 5, 1, 6, 1, 7, 1, 8, 1 ],
//   production_forecast_array: [ 11, 17, 19, 24, 26, 27, 27, 26, 23, 15, 12, 18, 19, 14, 12, 8, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 5, 7, 11, 13 ],
//   hps_weight_array:          [ 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1 ],
//   hps_consumption_array:     [ 7, 2, 2, 1, 4, 9, 8, 5, 7, 5, 4, 4, 9, 3, 7, 5, 3, 9, 3, 9, 7, 2, 3, 6, 1, 6, 5, 5, 8, 8, 2, 4, 5, 6, 9, 9, 3, 9, 8, 7, 4, 8, 4, 8, 9, 4, 4, 2 ],
//   fs_weight_array:           [ 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1, 1, 1, 1, 3, 3 ],
//   fs_consumption_array:      [ 5, 5, 2, 3, 7, 9, 9, 12, 12, 10, 8, 7, 9, 3, 6, 6, 4, 9, 1, 2, 2, 6, 3, 5, 7, 3, 7, 3, 1, 1, 3, 4, 6, 7, 8, 5, 1, 4, 8, 5, 3, 5, 4, 3, 4, 0, 1, 9 ],
// };

// this is just an attempt to figure out how to integrate the autopilot with quokka.
// I doubt it can be done, but maybe by importing the file externally we can do it.
@Injectable()
export class AutopilotService {
  isAutopilotRunning = false;

  constructor(
    private readonly gridsService: GridsService,
    @InjectDataSource('timescale')
    protected readonly timescale: DataSource,
    protected readonly httpService: HttpService,
    private readonly victronService: VictronService,
  ) { }
  lastTwoBatteryStates: number[] = [];

  @Cron('*/15 * * * *', { disabled: process.env.NXT_ENV !== 'production' })
  async simpleEquationTest() {
    // we need to reset it because it might not be empty, since it can be
    // called from the update grid resolver
    const matari: Grid = await this.gridsService.findByName('Matari');

    const diagnostics = await this.victronService.fetchDiagnostics(matari.generation_external_site_id);
    const batteryStateObj = diagnostics.find(test => test.code === 'bs');


    if (!batteryStateObj) {
      console.info('Battery state not found');
      return;
    }

    const batteryState = round(toSafeNumberOrZero(batteryStateObj.rawValue));
    this.lastTwoBatteryStates.push(batteryState);

    // If more than two, we pop the oldest number out of the front of the array
    if (this.lastTwoBatteryStates.length > 2) this.lastTwoBatteryStates.shift();

    // If less than two, then we return, since not enough data to do progress
    if (this.lastTwoBatteryStates.length < 2) return;

    // now we have the last two elements of the array, so we can determine the slope
    const now = moment();
    const x2 = now.hour() * 60 + now.minute();
    const x1 = x2 - 15; //We are using a 15 min interval
    const y2 = this.lastTwoBatteryStates[1];
    const y1 = this.lastTwoBatteryStates[0];
    const meqvar = (y2 - y1) / (x2 - x1);
    const beqvar = y1 - meqvar * x1;

    // If the battery state is constant, then we are not consuming, so nothing to do
    if (meqvar === 0) {
      console.info('Battery not consuming, keep FS ON');
      return;
    }

    if (meqvar > 0) {
      console.info('Battery is charging, FS should be set to ON');
      return;
    }

    // now that we have m and b, we can find out, given the current slope, at what minute in the day
    // the battery will be at 0%
    const zeroBatteryMinute = beqvar / meqvar;
    const SUNRISE_MINUTE = 6 * 60 + 39; //Sunrise is at 6 39 AM

    // If the battery runs out tomorrow, then check against sunrise
    if (zeroBatteryMinute > 1440) {
      // If the battery runs out before sunrise, then switch off asap
      if (zeroBatteryMinute - 1440 < SUNRISE_MINUTE) {
        console.info(`Battery is going to run out at minute ${ zeroBatteryMinute } (before sunrise), FS should be set to OFF asap if it's not already OFF`);
      }
      else {
        // If the battery runs out after sunrise, we should try to let meters
        // consume as much as possible
        console.info(`Battery is going to run out at minute ${ zeroBatteryMinute } (after sunrise), FS should be set to ON asap if it's not already ON`);
      }
    }
    else {
      // if the battery runs out before midnight, then we are already doing bad,
      // so we want to switch off FS asap
      console.info(`Battery is going to run out before the end of today (at minute ${ zeroBatteryMinute }), FS should be switched OFF asap if it's not already OFF`);
    }
  }

  private calculateBatteryAvailable(array, initialBattery): any[] {
    if (array.length < 1) return []; //base condition
    const currentElement = array.shift(); //shortens the length of the array
    // currentElement
    let battery_available_kwh_period_end = currentElement.battery_flow_kwh + initialBattery;
    if (battery_available_kwh_period_end > BATTERY_CAPACITY_KWH) {
      currentElement.battery_flow_kwh = BATTERY_CAPACITY_KWH - initialBattery;
      currentElement.battery_consumed_production_kwh = currentElement.battery_flow_kwh / BATTERY_EFFICIENCY;
      battery_available_kwh_period_end = BATTERY_CAPACITY_KWH;
    }

    if (battery_available_kwh_period_end < 0) {
      currentElement.battery_flow_kwh = -1 * initialBattery;
      battery_available_kwh_period_end = 0;
    }

    return [ { ...currentElement, battery_available_kwh_period_end: battery_available_kwh_period_end }, ...this.calculateBatteryAvailable(array, battery_available_kwh_period_end) ];
  }

  private appendIntermediateValues(datapoint) {
    const hpsConsumptionForecastActualKwh = datapoint.hps_consumption_forecast_potential_kwh;
    const fsConsumptionForecastActualKwh = datapoint.fs_target_on ? datapoint.fs_consumption_forecast_potential_kwh : 0;

    const productionAfterLoadskWh = datapoint.production_forecast_kwh -
      (hpsConsumptionForecastActualKwh + fsConsumptionForecastActualKwh);
    let batteryFlowkWh; let batteryConsumedProductionkWh;
    if (productionAfterLoadskWh > 0) {
      batteryFlowkWh = productionAfterLoadskWh * BATTERY_EFFICIENCY;
      batteryConsumedProductionkWh = productionAfterLoadskWh;
    }
    else {
      batteryFlowkWh = productionAfterLoadskWh / BATTERY_EFFICIENCY;
      batteryConsumedProductionkWh = 0;
    }

    return {
      ...datapoint,
      hps_consumption_forecast_actual_kwh: hpsConsumptionForecastActualKwh,
      fs_consumption_forecast_actual_kwh: fsConsumptionForecastActualKwh,
      production_after_loads_kwh: productionAfterLoadskWh,
      battery_flow_kwh: batteryFlowkWh,
      battery_consumed_production_kwh: batteryConsumedProductionkWh,
    };
  }

  private appendUptimes(datapoint) {
    //adding at most 0.5 since half hour
    const excessProductionkWh = datapoint.production_after_loads_kwh - datapoint.battery_consumed_production_kwh;
    const curtailmentHours = 0.5 * (excessProductionkWh / datapoint.production_after_loads_kwh);
    const actualCurtailmentHours = (datapoint.production_after_loads_kwh > 0) ? curtailmentHours : 0;

    let uptime;
    if (datapoint.production_after_loads_kwh > 0) {
      uptime = 0.5;
    }
    else {
      if (Math.abs(datapoint.battery_flow_kwh) > Math.abs(datapoint.production_after_loads_kwh)) {
        uptime = 0.5;
      }
      else if (Math.abs(datapoint.battery_flow_kwh) > 0) {
        uptime = 0.5 * Math.abs(datapoint.battery_flow_kwh) * BATTERY_EFFICIENCY / Math.abs(datapoint.production_after_loads_kwh);
      }
      else {
        uptime = 0;
      }
    }

    // const score = calculateScore(datapoint);
    return {
      ...datapoint,
      uptime_hps_hours: uptime, //adding 0.5 since half hour
      curtailment_hours: actualCurtailmentHours,
      uptime_fs_hours_actual: datapoint.fs_target_on ? uptime : 0,
      // score: score,
    };
  }

  private generateSolution(inputObject: any, productionForecast48H: any[]) {
    const results = productionForecast48H.map(this.appendIntermediateValues);
    // need to use recursion since the result of every iteration depends on the previous one
    const batteryRemainingArray = this.calculateBatteryAvailable(results, inputObject.initial_battery_kwh);
    return batteryRemainingArray.map(this.appendUptimes);
  }

  private prepareArrays(inputObject: any, fsOnArray: number[]){
    const result = [];
    for (let i = 0; i < inputObject.series_length; i++) {
      result.push({
        // hour: (inputObject.hour_at_index_zero + i) % 48,
        production_forecast_kwh: inputObject.production_forecast_array[i] ?? 0,
        hps_consumption_forecast_potential_kwh: inputObject.hps_consumption_array[i] ?? 0,
        fs_consumption_forecast_potential_kwh: inputObject.fs_consumption_array[i] ?? 0,
        fs_target_on: fsOnArray[i] ?? 0,
        hps_uptime_weight_multiplier: inputObject.hps_weight_array[i] ?? 1,
        fs_uptime_weight_multiplier: inputObject.fs_weight_array[i] ?? 1,
        // inverters_on: invertersOn[i],
      });
    }

    return result;
  }

  private isABetterThanB(index, compositeScoreA, compositeScoreB) {
    if (USE_COMPOSITE_SCORES) {
      return this.isABetterThanBWithScore(index, compositeScoreA, compositeScoreB);
    }
    else {
      return this.isABetterThanBWithParameters(index, compositeScoreA, compositeScoreB);
    }
  }

  // scoreA is the challenger, scoreB is the incumbent.
  // -1 means challenger wins
  private isABetterThanBWithParameters(index, compositeScoreA, compositeScoreB) {
    // if (scoreA.uptime_hps_hours > 11) {
    //   console.log(index);
    //   console.log(scoreA);
    //   console.log(scoreB);
    // }
    // if (scoreA.uptime_fs_hours_actual === 0) {
    //   console.log(index);
    //   console.log(scoreA);
    //   console.log(scoreB);
    // }
    // if (index === 48) {
    // console.log(scoreA);
    // console.log(scoreB);
    // }

    if (!compositeScoreA && compositeScoreB) return -1;

    if (compositeScoreA && !compositeScoreB) return 1;

    if (compositeScoreA.uptime_hps_hours > compositeScoreB.uptime_hps_hours) return 1;

    if (compositeScoreA.uptime_hps_hours < compositeScoreB.uptime_hps_hours) return -1;

    if (compositeScoreA.curtailment_hours > compositeScoreB.curtailment_hours) return -1;

    if (compositeScoreA.curtailment_hours < compositeScoreB.curtailment_hours) return 1;

    if (compositeScoreA.uptime_fs_hours_actual > compositeScoreB.uptime_fs_hours_actual) return 1;

    if (compositeScoreA.uptime_fs_hours_actual < compositeScoreB.uptime_fs_hours_actual) return -1;

    // the one switching full service on/off the least wins
    let fsSwitchingCounterA = 0; let fsSwitchingCounterB = 0;

    if (compositeScoreA.turn_on_index === null) {
      fsSwitchingCounterA++;
    }

    if (compositeScoreA.turn_off_index === null) {
      fsSwitchingCounterA++;
    }

    if (compositeScoreB.turn_on_index === null) {
      fsSwitchingCounterB++;
    }

    if (compositeScoreB.turn_off_index === null) {
      fsSwitchingCounterB++;
    }

    if (fsSwitchingCounterA > fsSwitchingCounterB) return 1;

    if (fsSwitchingCounterA < fsSwitchingCounterB) return -1;

    return 0;
  }

  private isABetterThanBWithScore(index, compositeScoreA, compositeScoreB) {
    if (!compositeScoreA && compositeScoreB) return -1;

    if (compositeScoreA && !compositeScoreB) return 1;

    if (compositeScoreA.score > compositeScoreB.score) return 1;

    if (compositeScoreA.score < compositeScoreB.score) return -1;

    return 0;
  }

  private computeCompositeScores(solution, initialState: number, initialLocalTime: moment.Moment) {
    const compositeScore = solution.reduce((acc, curr) => {
      const uptimeHpsHoursWeighted = acc.uptime_hps_hours_weighted + curr.uptime_hps_hours * curr.hps_uptime_weight_multiplier * SCORE_MULTIPLIER_HPS_UPTIME;
      const uptimeFsHoursActualWeighted = acc.uptime_fs_hours_actual_weighted + curr.uptime_fs_hours_actual * curr.fs_uptime_weight_multiplier * SCORE_MULTIPLIER_FS_UPTIME;

      acc.fs_target_hours = acc.fs_target_hours + 0.5 * curr.fs_target_on;
      acc.uptime_hps_hours = acc.uptime_hps_hours + curr.uptime_hps_hours;
      acc.uptime_hps_hours_weighted = uptimeHpsHoursWeighted;
      acc.uptime_fs_hours_actual = acc.uptime_fs_hours_actual + curr.uptime_fs_hours_actual;
      acc.uptime_fs_hours_actual_weighted = uptimeFsHoursActualWeighted;
      acc.curtailment_hours = acc.curtailment_hours + curr.curtailment_hours;
      // todo: this is too simple, not working. needs to be refined (Feb 26th 2024)
      acc.score = uptimeFsHoursActualWeighted + uptimeHpsHoursWeighted + acc.curtailment_hours * SCORE_MULTIPLIER_PV_CURTAILMENT;
      return acc;
    }, {
      score: -1,
      uptime_hps_hours: 0,
      uptime_hps_hours_weighted: 0,
      uptime_fs_hours_actual: 0,
      uptime_fs_hours_actual_weighted: 0,
      curtailment_hours: 0,
      fs_target_hours: 0,
      turn_on_index: null,
      turn_off_index: null,
      turn_on_local_time: null,
      turn_off_local_time: null,
    });

    // adding meta information to the score, so we know what the corresponding solution is actually doing
    let previousState = initialState;
    for (let index = 0; index < solution.length; index++) {
      if (previousState !== solution[index].fs_target_on) {
        if (previousState === 0) {
          compositeScore.turn_on_index = index;
          compositeScore.turn_on_local_time = moment(initialLocalTime).add(index * 30, 'minutes');
        }
        else {
          compositeScore.turn_off_index = index;
          compositeScore.turn_off_local_time = moment(initialLocalTime).add(index * 30, 'minutes');
        }
      }

      previousState = solution[index].fs_target_on;
    }

    return compositeScore;
  }

  private generateFS48HMatrixOneDirection(pointerIndex: number, initialState: number) {
    if (pointerIndex === 0) return [ new Array(SERIES_LENGTH).fill(Number(!initialState)) ];

    const newArray = (initialState === 0) ?
      [ ...new Array(SERIES_LENGTH - pointerIndex).fill(1), ...new Array(pointerIndex).fill(0) ] :
      [ ...new Array(pointerIndex).fill(1), ...new Array(SERIES_LENGTH - pointerIndex).fill(0) ];

    return [ newArray, ...this.generateFS48HMatrixOneDirection(pointerIndex - 1, initialState) ];
  }

  private generateFS48HMatrixIslands(arrayLength: number, initialState: number) {
    const islandState = Number(!initialState);
    const arrays = [];
    for (let i = 1; i <= arrayLength - 2; i++) { //i is the offset of the island
      for (let jir = 1; jir < arrayLength - i; jir++) { //j is the length of the island
        const row = new Array(i).fill(initialState); //before the island
        row.push(...new Array(jir).fill(islandState)); //island
        row.push(...new Array(arrayLength - jir - i).fill(initialState)); //after the island
        arrays.push(row);
      }
    }

    return arrays;
  }

  public findBestSolution(inputObject: any) {
    const escalatingSolutionSet = [];
    const seriesLength = inputObject.series_length;

    const fsTargetOn48HArrayMatrixOneDirection = this.generateFS48HMatrixOneDirection(seriesLength, inputObject.current_fs_state);
    const fsTargetOn48HArrayMatrixOneDirectionInverse = this.generateFS48HMatrixOneDirection(seriesLength, (inputObject.current_fs_state) ? 0 : 1);
    // console.log(fsTargetOn48HArrayMatrixOneDirectionInverse);
    const fsTargetOn48HArrayMatrixIslands = this.generateFS48HMatrixIslands(seriesLength, inputObject.current_fs_state);
    const fsTargetOn48HArrayMatrixIslandsInverse = this.generateFS48HMatrixIslands(seriesLength, (inputObject.current_fs_state) ? 0 : 1);

    const solutionsToProcessMatrix = [
      ...fsTargetOn48HArrayMatrixOneDirection,
      ...fsTargetOn48HArrayMatrixOneDirectionInverse,
      ...fsTargetOn48HArrayMatrixIslands,
      ...fsTargetOn48HArrayMatrixIslandsInverse ];
    // bug: the last array should have all 1s, but the last element is still 0
    // const inverterOn48HArrayMatrix = generateInverterOn48HMatrix(seriesLength, inputObject.current_fs_state);
    // inverterOn48HArrayMatrix;
    // let bestSolution;
    let bestScore;
    for (let i = 0; i < solutionsToProcessMatrix.length; i++) {
    // console.log(i);

      const fsTargetOn48HArray = solutionsToProcessMatrix[i];
      // const invertersOn48HArray = inverterOn48HArrayMatrix[i];
      // invertersOn48HArray
      const preparedInputsArray = this.prepareArrays(inputObject, fsTargetOn48HArray);
      // preparedInputsArray;
      const solution = this.generateSolution(inputObject, preparedInputsArray);

      const compositeScore = this.computeCompositeScores(solution, inputObject.current_fs_state, inputObject.initial_local_time);
      // score;
      // console.log(i);
      // console.log(score);
      const isBetterThanPrevious = this.isABetterThanB(i, compositeScore, bestScore);
      // isBetterThanPrevious;

      // if (i === 1150) {
      //   console.log(i);
      //   console.log(score);
      //   console.log(bestScore);
      //   console.log(isBetterThanPrevious);
      // }
      if (isBetterThanPrevious === 1 || !i) {
        bestScore = compositeScore;
        // bestSolution = solution;
        // console.log(i); //-> to print
        // console.log(bestScore); //-> to print
        escalatingSolutionSet.push({
          index: i,
          solution: bestScore,
        });
      // bestSolution;
      }
    }

    // return bestSolution;
    return escalatingSolutionSet;
  }

  private async getHourlyConsumptionForecastByGridIdAndMeterType(
    gridId: number,
    meterType: MeterTypeEnum,
    start: moment.Moment,
    end: moment.Moment,
    minConsumptionKwh: number,
    maxConsumptionKwh: number) {

    const query = `select date_part('hour', bucket) as hour, date_part('minute', bucket) as minute,
      coalesce(avg(consumption_kwh), 0) as kwh
      from (
        select time_bucket_gapfill('30 minutes', created_at) as bucket,
          locf(sum(consumption_kwh) / 2) as consumption_kwh
          from meter_snapshot_1_h
          where grid_id = $1
          and created_at >= $2
          and created_at < $3
          and meter_type = $4
          and consumption_kwh >= $5
          and consumption_kwh < $6
          group by bucket
      ) as t
      group by hour, minute`;

    return this.timescale.query(query, [
      gridId,
      start.format('YYYY-MM-DD HH:mm:ss'),
      end.format('YYYY-MM-DD HH:mm:ss'),
      meterType,
      minConsumptionKwh,
      maxConsumptionKwh,
    ]);
  }

  private async getHourlyProductionForecastByGridId(gridId: number, start: moment.Moment, end: moment.Moment) {
    const query = `select date_part('hour', bucket) as hour, date_part('minute', bucket) as minute, coalesce(t.kwh, 0) as kwh
      from (
        select time_bucket_gapfill('30 minutes', period_start) as bucket,
          sum(pv_estimate_kw) / 2 as kwh
            from mppt_forecast_snapshot_30_min
            where grid_id = $1
            and period_start >= $2
            and period_start < $3
            group by bucket
      ) as t`;

    return this.timescale.query(query, [ gridId, start.format('YYYY-MM-DD HH:mm:ss'), end.format('YYYY-MM-DD HH:mm:ss') ]);
  }

  private convertToLocalHour(datapoint, timezone: string) {
    const todayStart = moment({ hour: 0, minute: 0, second: 0, millisecond: 0 });
    const utcTime = moment.utc(todayStart).hours(datapoint.hour ?? 0).minutes(datapoint.minute ?? 0);
    const localTime = moment.tz(utcTime, timezone);
    return {
      kwh: datapoint?.kwh ?? 0,
      local_hour: localTime.hour(),
      local_minute: localTime.minute(),
    };
  }

  @Cron(CronExpression.EVERY_30_MINUTES, { disabled: process.env.NXT_ENV !== 'production' })
  async run() {
    if (this.isAutopilotRunning) return;
    this.isAutopilotRunning = true;

    try {
      const iteration = moment().unix();
      const nowUTC = moment.utc().seconds(0).milliseconds(0);
      const minutesToAdd = nowUTC.minutes() > 30 ? 60 - nowUTC.minutes() : 30 - nowUTC.minutes();
      const nextHalfHourUTC = moment(nowUTC).add(minutesToAdd, 'minutes'); //using utc to make it easier to debug locally

      const tenDaysAgoUTC = moment(nextHalfHourUTC).subtract(10, 'days');
      const twoDaysAgoUTC = moment(nextHalfHourUTC).subtract(2, 'days');
      const tomorrowUTC = moment(nextHalfHourUTC).add(1, 'day');

      const grids: Grid[] = await this.gridsService.findByIsHiddenFromReporting(false);

      // for each grid, get the hps/fs expected consumption in the last 7 days from now, expected production for the next 2 days from now.
      for(const grid of grids) {
        try {
          const hpsConsumptionArrayUTC = await this.getHourlyConsumptionForecastByGridIdAndMeterType(grid.id, 'HPS', tenDaysAgoUTC, twoDaysAgoUTC, MIN_CONSUMPTION_KWH_THRESHOLD, MAX_CONSUMPTION_KWH_THRESHOLD);
          const fsConsumptionArrayUTC = await this.getHourlyConsumptionForecastByGridIdAndMeterType(grid.id, 'FS', tenDaysAgoUTC, twoDaysAgoUTC, MIN_CONSUMPTION_KWH_THRESHOLD, MAX_CONSUMPTION_KWH_THRESHOLD);
          const productionArrayUTC = await this.getHourlyProductionForecastByGridId(grid.id, nextHalfHourUTC, tomorrowUTC);

          // we convert all hours in grid local time, so it's easier to reason about
          const hpsConsumptionArrayLocal = hpsConsumptionArrayUTC.map(datapoint => this.convertToLocalHour(datapoint, grid.timezone));
          const fsConsumptionArrayLocal = fsConsumptionArrayUTC.map(datapoint => this.convertToLocalHour(datapoint, grid.timezone));
          const productionArrayLocal = productionArrayUTC.map(datapoint => this.convertToLocalHour(datapoint, grid.timezone));

          // this is just for debugging, since we want to understand if the forecast consumption and
          // production in the coming 24h makes sense.
          const hpsConsumptionSum24H = hpsConsumptionArrayLocal.reduce((acc, curr) => {
            acc = acc + (curr?.kwh ?? 0);
            return acc;
          }, 0);

          const fsConsumptionSum24H = fsConsumptionArrayLocal.reduce((acc, curr) => {
            acc = acc + (curr?.kwh ?? 0);
            return acc;
          }, 0);

          const productionSum24H = productionArrayLocal.reduce((acc, curr) => {
            acc = acc + (curr?.kwh ?? 0);
            return acc;
          }, 0);

          const hpsConsumptionSum3H = hpsConsumptionArrayLocal.slice(0, 3).reduce((acc, curr) => {
            acc = acc + (curr?.kwh ?? 0);
            return acc;
          }, 0);

          const fsConsumptionSum3H = fsConsumptionArrayLocal.slice(0, 3).reduce((acc, curr) => {
            acc = acc + (curr?.kwh ?? 0);
            return acc;
          }, 0);

          const productionSum3H = productionArrayLocal.slice(0, 3).reduce((acc, curr) => {
            acc = acc + (curr?.kwh ?? 0);
            return acc;
          }, 0);

          // since the input arrays start from midnight of the first day and end at the midnight of the second day
          // we need to rotate those arrays so that the first index corresponds to the next half hour.
          const rotate = pipe(splitAt, reverse, flatten);
          const formatString = nextHalfHourUTC.format('YYYY-MM-DD HH:mm:ss');
          const nextHalfHourLocal = moment.utc(formatString).tz(grid.timezone);
          const rotateByNIndexes = nextHalfHourUTC.hour() * 2;
          const rotatedHpsConsumptionArrayLocal = rotate(rotateByNIndexes, hpsConsumptionArrayLocal);
          const rotatedFsConsumptionArrayLocal = rotate(rotateByNIndexes, fsConsumptionArrayLocal);
          // no need to rotate the production array, since it's already starting from right now

          // @TODO :: We're fetching for grids that don't have production, we should skip those.
          const diagnostics = await this.victronService.fetchDiagnostics(grid.generation_external_site_id);
          const soc = diagnostics.find(attribute => attribute.code === 'bs');

          if(isNil(soc))
            throw new Error(`Invalid soc not available in autopilot run for grid ${ grid.name }`);

          // if the soc was recorded more than 10 minutes ago, then skip since invalid
          const socTimestamp = moment.unix(soc.timestamp);
          if(socTimestamp.isBefore(moment().subtract(10, 'minutes')))
            throw new Error(`Soc supplied by VRM older than 10 minutes in autopilot run for grid ${ grid.name }`);

          const currentFsState = grid.is_fs_on && grid.is_hps_on;
          const initialBatteryKWh = soc.rawValue * 0.01 * grid.kwh;
          const escalatingSolutionSet = this.findBestSolution(
            {
              // todo: add uptime_hps_hours to tracking
              initial_local_time: nextHalfHourLocal,
              series_length: SERIES_LENGTH,
              current_fs_state: currentFsState,
              initial_battery_kwh: initialBatteryKWh,
              production_forecast_array: productionArrayLocal.map(datapoint => datapoint?.kwh ?? 0),
              hps_weight_array:          HPS_WEIGHT_ARRAY,
              hps_consumption_array:     rotatedHpsConsumptionArrayLocal.map((datapoint: { kwh: number }) => datapoint?.kwh ?? 0),
              fs_weight_array:           FS_WEIGHT_ARRAY,
              fs_consumption_array:      rotatedFsConsumptionArrayLocal.map((datapoint: { kwh: number }) => datapoint?.kwh ?? 0),
            },
          );

          const toSendToTimescale = escalatingSolutionSet.map(datapoint => ({
            created_at: nowUTC.toDate(),
            iteration: iteration,
            grid_name: grid.name,
            grid_id: grid.id,
            index: datapoint.index,
            score: datapoint.solution.score,
            uptime_hps_hours: datapoint.solution.uptime_hps_hours,
            uptime_hps_hours_weighted: datapoint.solution.uptime_hps_hours_weighted,
            uptime_fs_hours_actual: datapoint.solution.uptime_fs_hours_actual,
            uptime_fs_hours_actual_weighted: datapoint.solution.uptime_fs_hours_actual_weighted,
            curtailment_hours: datapoint.solution.curtailment_hours,
            fs_target_hours: datapoint.solution.fs_target_hours,
            turn_on_index: datapoint.solution.turn_on_index,
            turn_off_index: datapoint.solution.turn_off_index,
            turn_on_local_time: datapoint.solution.turn_on_local_time,
            turn_off_local_time: datapoint.solution.turn_off_local_time,
            initial_battery_kwh: initialBatteryKWh,
            is_fs_on: currentFsState,
            hps_consumption_kwh_sum_24_h: hpsConsumptionSum24H,
            fs_consumption_kwh_sum_24_h: fsConsumptionSum24H,
            production_kwh_sum_24_h: productionSum24H,
            hps_consumption_kwh_sum_3_h: hpsConsumptionSum3H,
            fs_consumption_kwh_sum_3_h: fsConsumptionSum3H,
            production_kwh_sum_3_h: productionSum3H,
          }));

          const propSet = toSendToTimescale.reduce((acc, curr) => {
            acc.push(...Object.keys(curr));
            return acc;
          }, []);

          await this.timescale
            .createQueryBuilder()
            .insert()
            .into('autopilot_solutions_30_min', uniq(propSet))
            .values(toSendToTimescale)
            .orIgnore()
            .execute();
        }
        catch(gridError) {
          console.error(`[AUTOPILOT ERROR] For ${ grid.name }:`, gridError.message ?? gridError);
        }
      }
    }
    catch(err) {
      console.error(err.message ?? err);
    }
    finally {
      this.isAutopilotRunning = false;
    }
  }
}
