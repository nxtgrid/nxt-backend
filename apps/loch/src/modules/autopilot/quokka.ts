// // constants
// const BATTERY_EFFICIENCY = 0.95; //static param
// const BATTERY_CAPACITY_KWH = 90; //static param

// const SCORE_MULTIPLIER_FS_UPTIME = 1;
// const SCORE_MULTIPLIER_HPS_UPTIME = 3;
// const SCORE_MULTIPLIER_PV_CURTAILMENT = -5;
// // todo: can only be used when the scoring system makes sense. We are not there yet (Feb 26th 2024).
// const USE_COMPOSITE_SCORES = true;
// // const CURRENT_HOUR = 10; //change at every iteration
// // const CURRENT_MINUTE = 30; //change at every iteration

// // todo:
// // * show turn on/off effective HOUR
// // * import solcast data for production forecast array
// // * import hps/fs consumption array (7 day average). we filter out negative readings and greater 5kWh/hour
// // * make it grid dependent (will probably need to have a param that says what grid we are dealing with)
// // * think of a way to plot hourly runs in a easy-to-debug way

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

// // todo (from Jan 8th 2024): check battery_flow_kwh behaviour: clearly bug. it keeps being positive even if the battery is full.
// let copyOfVarForDebuggingBestScore;

// const generateSolution = (inputObject: any, productionForecast48H: any[]) => {
//   function calculateBatteryAvailable(array, initialBattery): any[] {
//     if (array.length < 1) return []; //base condition
//     const currentElement = array.shift(); //shortens the length of the array
//     // currentElement
//     let battery_available_kwh_period_end = currentElement.battery_flow_kwh + initialBattery;
//     if (battery_available_kwh_period_end > BATTERY_CAPACITY_KWH) {
//       currentElement.battery_flow_kwh = BATTERY_CAPACITY_KWH - initialBattery;
//       currentElement.battery_consumed_production_kwh = currentElement.battery_flow_kwh / BATTERY_EFFICIENCY;
//       battery_available_kwh_period_end = BATTERY_CAPACITY_KWH;
//     }

//     if (battery_available_kwh_period_end < 0) {
//       currentElement.battery_flow_kwh = -1 * initialBattery;
//       battery_available_kwh_period_end = 0;
//     }

//     return [ { ...currentElement, battery_available_kwh_period_end: battery_available_kwh_period_end }, ...calculateBatteryAvailable(array, battery_available_kwh_period_end) ];
//   }

//   const appendIntermediateValues = datapoint => {
//     const hpsConsumptionForecastActualKwh = datapoint.hps_consumption_forecast_potential_kwh;
//     const fsConsumptionForecastActualKwh = datapoint.fs_target_on ? datapoint.fs_consumption_forecast_potential_kwh : 0;

//     const productionAfterLoadskWh = datapoint.production_forecast_kwh -
//       (hpsConsumptionForecastActualKwh + fsConsumptionForecastActualKwh);
//     let batteryFlowkWh; let batteryConsumedProductionkWh;
//     if (productionAfterLoadskWh > 0) {
//       batteryFlowkWh = productionAfterLoadskWh * BATTERY_EFFICIENCY;
//       batteryConsumedProductionkWh = productionAfterLoadskWh;
//     }
//     else {
//       batteryFlowkWh = productionAfterLoadskWh / BATTERY_EFFICIENCY;
//       batteryConsumedProductionkWh = 0;
//     }

//     return {
//       ...datapoint,
//       hps_consumption_forecast_actual_kwh: hpsConsumptionForecastActualKwh,
//       fs_consumption_forecast_actual_kwh: fsConsumptionForecastActualKwh,
//       production_after_loads_kwh: productionAfterLoadskWh,
//       battery_flow_kwh: batteryFlowkWh,
//       battery_consumed_production_kwh: batteryConsumedProductionkWh,
//     };
//   };

//   // todo: implementation of the function
//   // const calculateScore = datapoint => {
//   //   return 1;
//   // };

//   const appendUptimes = datapoint => {
//     //adding at most 0.5 since half hour
//     const excessProductionkWh = datapoint.production_after_loads_kwh - datapoint.battery_consumed_production_kwh;
//     const curtailmentHours = 0.5 * (excessProductionkWh / datapoint.production_after_loads_kwh);
//     const actualCurtailmentHours = (datapoint.production_after_loads_kwh > 0) ? curtailmentHours : 0;

//     let uptime;
//     if (datapoint.production_after_loads_kwh > 0) {
//       uptime = 0.5;
//     }
//     else {
//       if (Math.abs(datapoint.battery_flow_kwh) > Math.abs(datapoint.production_after_loads_kwh)) {
//         uptime = 0.5;
//       }
//       else if (Math.abs(datapoint.battery_flow_kwh) > 0) {
//         uptime = 0.5 * Math.abs(datapoint.battery_flow_kwh) * BATTERY_EFFICIENCY / Math.abs(datapoint.production_after_loads_kwh);
//       }
//       else {
//         uptime = 0;
//       }
//     }

//     // const score = calculateScore(datapoint);
//     return {
//       ...datapoint,
//       uptime_hps_hours: uptime, //adding 0.5 since half hour
//       curtailment_hours: actualCurtailmentHours,
//       uptime_fs_hours_actual: datapoint.fs_target_on ? uptime : 0,
//       // score: score,
//     };
//   };

//   const results = productionForecast48H.map(appendIntermediateValues);
//   // need to use recursion since the result of every iteration depends on the previous one
//   const batteryRemainingArray = calculateBatteryAvailable(results, inputObject.initial_battery_kwh);
//   return batteryRemainingArray.map(appendUptimes);
// };

// const findBestSolution = (inputObject: any) => {
//   const seriesLength = inputObject.series_length;

//   const prepareArrays = (inputObject: any, fsOnArray: number[]) => {
//     const result = [];
//     for (let i = 0; i < inputObject.series_length; i++) {
//       result.push({
//         production_forecast_kwh: inputObject.production_forecast_array[i],
//         hps_consumption_forecast_potential_kwh: inputObject.hps_consumption_array[i],
//         fs_consumption_forecast_potential_kwh: inputObject.fs_consumption_array[i],
//         fs_target_on: fsOnArray[i],
//         hps_uptime_weight_multiplier: inputObject.hps_weight_array[i],
//         fs_uptime_weight_multiplier: inputObject.fs_weight_array[i],
//         // inverters_on: invertersOn[i],
//       });
//     }

//     return result;
//   };

//   const isABetterThanB = (index, compositeScoreA, compositeScoreB) => {
//     if (USE_COMPOSITE_SCORES) {
//       return isABetterThanBWithScore(index, compositeScoreA, compositeScoreB);
//     }
//     else {
//       return isABetterThanBWithParameters(index, compositeScoreA, compositeScoreB);
//     }
//   };

//   // scoreA is the challenger, scoreB is the incumbent.
//   // -1 means challenger wins
//   const isABetterThanBWithParameters = (index, compositeScoreA, compositeScoreB) => {
//     // if (scoreA.uptime_hps_hours > 11) {
//     //   console.log(index);
//     //   console.log(scoreA);
//     //   console.log(scoreB);
//     // }
//     // if (scoreA.uptime_fs_hours_actual === 0) {
//     //   console.log(index);
//     //   console.log(scoreA);
//     //   console.log(scoreB);
//     // }
//     // if (index === 48) {
//     // console.log(scoreA);
//     // console.log(scoreB);
//     // }

//     if (!compositeScoreA && compositeScoreB) return -1;

//     if (compositeScoreA && !compositeScoreB) return 1;

//     if (compositeScoreA.uptime_hps_hours > compositeScoreB.uptime_hps_hours) return 1;

//     if (compositeScoreA.uptime_hps_hours < compositeScoreB.uptime_hps_hours) return -1;

//     if (compositeScoreA.curtailment_hours > compositeScoreB.curtailment_hours) return -1;

//     if (compositeScoreA.curtailment_hours < compositeScoreB.curtailment_hours) return 1;

//     if (compositeScoreA.uptime_fs_hours_actual > compositeScoreB.uptime_fs_hours_actual) return 1;

//     if (compositeScoreA.uptime_fs_hours_actual < compositeScoreB.uptime_fs_hours_actual) return -1;

//     // the one switching full service on/off the least wins
//     let fsSwitchingCounterA = 0; let fsSwitchingCounterB = 0;

//     if (compositeScoreA.turn_on_index === null) {
//       fsSwitchingCounterA++;
//     }

//     if (compositeScoreA.turn_off_index === null) {
//       fsSwitchingCounterA++;
//     }

//     if (compositeScoreB.turn_on_index === null) {
//       fsSwitchingCounterB++;
//     }

//     if (compositeScoreB.turn_off_index === null) {
//       fsSwitchingCounterB++;
//     }

//     if (fsSwitchingCounterA > fsSwitchingCounterB) return 1;

//     if (fsSwitchingCounterA < fsSwitchingCounterB) return -1;

//     return 0;
//   };

//   const isABetterThanBWithScore = (index, compositeScoreA, compositeScoreB) => {
//     if (!compositeScoreA && compositeScoreB) return -1;

//     if (compositeScoreA && !compositeScoreB) return 1;

//     if (compositeScoreA.score > compositeScoreB.score) return 1;

//     if (compositeScoreA.score < compositeScoreB.score) return -1;

//     return 0;
//   };

//   const computeCompositeScores = (solution, initialState: number) => {
//     const compositeScore = solution.reduce((acc, curr) => {
//       const uptimeHpsHoursWeighted = acc.uptime_hps_hours_weighted + curr.uptime_hps_hours * curr.hps_uptime_weight_multiplier * SCORE_MULTIPLIER_HPS_UPTIME;
//       const uptimeFsHoursActualWeighted = acc.uptime_fs_hours_actual_weighted + curr.uptime_fs_hours_actual * curr.fs_uptime_weight_multiplier * SCORE_MULTIPLIER_FS_UPTIME;

//       acc.fs_target_hours = acc.fs_target_hours + 0.5 * curr.fs_target_on;
//       acc.uptime_hps_hours = acc.uptime_hps_hours + curr.uptime_hps_hours;
//       acc.uptime_hps_hours_weighted = uptimeHpsHoursWeighted;
//       acc.uptime_fs_hours_actual = acc.uptime_fs_hours_actual + curr.uptime_fs_hours_actual;
//       acc.uptime_fs_hours_actual_weighted = uptimeFsHoursActualWeighted;
//       acc.curtailment_hours = acc.curtailment_hours + curr.curtailment_hours;
//       // todo: this is too simple, not working. needs to be refined (Feb 26th 2024)
//       acc.score = uptimeFsHoursActualWeighted + uptimeHpsHoursWeighted + acc.curtailment_hours * SCORE_MULTIPLIER_PV_CURTAILMENT;
//       return acc;
//     }, {
//       score: -1,
//       uptime_hps_hours: 0,
//       uptime_hps_hours_weighted: 0,
//       uptime_fs_hours_actual: 0,
//       uptime_fs_hours_actual_weighted: 0,
//       curtailment_hours: 0,
//       fs_target_hours: 0,
//       turn_on_index: null,
//       turn_off_index: null,
//     });

//     // adding meta information to the score, so we know what the corresponding solution is actually doing
//     let previousState = initialState;
//     for (let index = 0; index < solution.length; index++) {
//       if (previousState !== solution[index].fs_target_on) {
//         if (previousState === 0) {
//           compositeScore.turn_on_index = index;
//         }
//         else {
//           compositeScore.turn_off_index = index;
//         }
//       }

//       previousState = solution[index].fs_target_on;
//     }

//     return compositeScore;
//   };

//   // [0, 0, 0, 0, 0, 0, 0, 1]
//   // [1, 1, 1, 1, 1, 1, 1, 0]
//   const generateFS48HMatrixOneDirection = (pointerIndex: number, initialState: number) => {
//     if (pointerIndex === 0) return [ new Array(seriesLength).fill(Number(!initialState)) ];

//     const newArray = (initialState === 0) ?
//       [ ...new Array(seriesLength - pointerIndex).fill(1), ...new Array(pointerIndex).fill(0) ] :
//       [ ...new Array(pointerIndex).fill(1), ...new Array(seriesLength - pointerIndex).fill(0) ];

//     return [ newArray, ...generateFS48HMatrixOneDirection(pointerIndex - 1, initialState) ];
//   };

//   const generateFS48HMatrixIslands = (arrayLength: number, initialState: number) => {
//     const islandState = Number(!initialState);
//     const arrays = [];
//     for (let i = 1; i <= arrayLength - 2; i++) { //i is the offset of the island
//       for (let jir = 1; jir < arrayLength - i; jir++) { //j is the length of the island
//         const row = new Array(i).fill(initialState); //before the island
//         row.push(...new Array(jir).fill(islandState)); //island
//         row.push(...new Array(arrayLength - jir - i).fill(initialState)); //after the island
//         arrays.push(row);
//       }
//     }

//     return arrays;
//   };

//   // const generateInverterOn48HMatrix = (pointerIndex: number, initialState: number) => {
//   //   console.info(pointerIndex, initialState);
//   //   const array1 = new Array(48).fill(1);
//   //   const array2 = [];
//   //   for (let i = 0; i < 48; i++) {
//   //     array2.push(array1);
//   //   }

//   //   return array2;
//   //   // return [ new Array(seriesLength).fill(1), ...generateFS48HMatrix(pointerIndex - 1, initialState) ];
//   //   // todo: add hps control, removed temporarily to ignore inverter control for now
//   //   // if (pointerIndex === 0) return [];

//   //   // const newArray = (initialState === 0) ?
//   //   //   [ ...new Array(seriesLength - pointerIndex).fill(1), ...new Array(pointerIndex).fill(0) ] :
//   //   //   [ ...new Array(pointerIndex).fill(1), ...new Array(seriesLength - pointerIndex).fill(0) ];

//   //   // return [ newArray, ...generateInverterOn48HMatrix(pointerIndex - 1, initialState) ];
//   // };

//   const fsTargetOn48HArrayMatrixOneDirection = generateFS48HMatrixOneDirection(seriesLength, inputObject.current_fs_state);
//   const fsTargetOn48HArrayMatrixOneDirectionInverse = generateFS48HMatrixOneDirection(seriesLength, (inputObject.current_fs_state) ? 0 : 1);
//   // console.log(fsTargetOn48HArrayMatrixOneDirectionInverse);
//   const fsTargetOn48HArrayMatrixIslands = generateFS48HMatrixIslands(seriesLength, inputObject.current_fs_state);
//   const fsTargetOn48HArrayMatrixIslandsInverse = generateFS48HMatrixIslands(seriesLength, (inputObject.current_fs_state) ? 0 : 1);

//   const solutionsToProcessMatrix = [
//     ...fsTargetOn48HArrayMatrixOneDirection,
//     ...fsTargetOn48HArrayMatrixOneDirectionInverse,
//     ...fsTargetOn48HArrayMatrixIslands,
//     ...fsTargetOn48HArrayMatrixIslandsInverse ];
//   // bug: the last array should have all 1s, but the last element is still 0
//   // const inverterOn48HArrayMatrix = generateInverterOn48HMatrix(seriesLength, inputObject.current_fs_state);
//   // inverterOn48HArrayMatrix;
//   let bestSolution; let bestScore;
//   for (let i = 0; i < solutionsToProcessMatrix.length; i++) {
//     // console.log(i);

//     const fsTargetOn48HArray = solutionsToProcessMatrix[i];
//     // const invertersOn48HArray = inverterOn48HArrayMatrix[i];
//     // invertersOn48HArray
//     const preparedInputsArray = prepareArrays(inputObject, fsTargetOn48HArray);
//     // preparedInputsArray;
//     const solution = generateSolution(inputObject, preparedInputsArray);
//     // if (i === 97) {
//     //   console.log(solution)
//     // }

//     const compositeScore = computeCompositeScores(solution, inputObject.current_fs_state);
//     // score;
//     // console.log(i);
//     // console.log(score);
//     const isBetterThanPrevious = isABetterThanB(i, compositeScore, bestScore);
//     // isBetterThanPrevious;

//     // if (i === 1150) {
//     //   console.log(i);
//     //   console.log(score);
//     //   console.log(bestScore);
//     //   console.log(isBetterThanPrevious);
//     // }
//     if (isBetterThanPrevious === 1 || !i) {
//       bestScore = compositeScore;
//       bestSolution = solution;
//       copyOfVarForDebuggingBestScore = bestScore;
//       // console.log(i);
//       // console.log(bestScore);
//       // bestSolution;
//     }
//   }

//   return bestSolution;
// };

// // entry point
// findBestSolution(INPUT_OBJECT);
// // bestSolution;
// copyOfVarForDebuggingBestScore;
// // console.info(bestSolution);
