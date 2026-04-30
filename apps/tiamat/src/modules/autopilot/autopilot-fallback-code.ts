// Bundled fallback version of the autopilot solver.
// Used when S3 is unavailable. Must be kept in sync with autopilotSolutions.ts in the autopilot repo.
// The service applies the same import→require transformation and variable injection as it does to S3 code.
export const AUTOPILOT_FALLBACK_CODE = `
import moment from 'moment-timezone';
import { pipe, flatten, splitAt, reverse } from 'ramda';

const NOW_PARTS_INJECTED = { year: 2025, month: 3, day: 29, hour: 17, utc_minute: 8, second: 0, millisecond: 0 };
const GRID_INJECTED = { id: 42, timezone: 'Africa/Lagos', kwh: 175, is_fs_on: true, is_hps_on: true };
const SOC_INJECTED = 0.33;
const CURRENT_FS_STATE_INJECTED = true;
const CURRENT_HPS_STATE_INJECTED = true;
const FS_TOGGLE_ARRAY_INJECTED = [2, 20];
const HPS_TOGGLE_ARRAY_INJECTED = [4, 17];
const PERIOD_START_INJECTED = "";

const ROTATE_ARRAYS_ENABLED = true;

const HPS_CONSUMPTION_ARRAY_UTC_DEFAULT = [
    { utc_hour:  0, utc_minute:  0, kwh: 0.22156475           },
    { utc_hour:  0, utc_minute: 30, kwh: 0.20136874999999999  },
    { utc_hour:  1, utc_minute:  0, kwh: 0.20136874999999999  },
    { utc_hour:  1, utc_minute: 30, kwh: 0.20136874999999999  },
    { utc_hour:  2, utc_minute:  0, kwh: 0.20136874999999999  },
    { utc_hour:  2, utc_minute: 30, kwh: 0.20136874999999999  },
    { utc_hour:  3, utc_minute:  0, kwh: 0.20136874999999999  },
    { utc_hour:  3, utc_minute: 30, kwh: 0.20136874999999999  },
    { utc_hour:  4, utc_minute:  0, kwh: 0.20136874999999999  },
    { utc_hour:  4, utc_minute: 30, kwh: 0.20136874999999999  },
    { utc_hour:  5, utc_minute:  0, kwh: 0.20136874999999999  },
    { utc_hour:  5, utc_minute: 30, kwh: 0.20136874999999999  },
    { utc_hour:  6, utc_minute:  0, kwh: 0.20136874999999999  },
    { utc_hour:  6, utc_minute: 30, kwh: 0.1286384            },
    { utc_hour:  7, utc_minute:  0, kwh: 1.6325842250000002   },
    { utc_hour:  7, utc_minute: 30, kwh: 2.8800680250000004   },
    { utc_hour:  8, utc_minute:  0, kwh: 2.723010475          },
    { utc_hour:  8, utc_minute: 30, kwh: 2.400152275          },
    { utc_hour:  9, utc_minute:  0, kwh: 2.3409271749999996   },
    { utc_hour:  9, utc_minute: 30, kwh: 2.3903369750000003   },
    { utc_hour: 10, utc_minute:  0, kwh: 1.5260448000000002   },
    { utc_hour: 10, utc_minute: 30, kwh: 1.537973825          },
    { utc_hour: 11, utc_minute:  0, kwh: 2.3357579750000004   },
    { utc_hour: 11, utc_minute: 30, kwh: 2.18898955           },
    { utc_hour: 12, utc_minute:  0, kwh: 2.430202725          },
    { utc_hour: 12, utc_minute: 30, kwh: 2.8566960000000003   },
    { utc_hour: 13, utc_minute:  0, kwh: 2.868158275          },
    { utc_hour: 13, utc_minute: 30, kwh: 2.3813888999999997   },
    { utc_hour: 14, utc_minute:  0, kwh: 2.35096875           },
    { utc_hour: 14, utc_minute: 30, kwh: 2.879141275          },
    { utc_hour: 15, utc_minute:  0, kwh: 2.2267625000000004   },
    { utc_hour: 15, utc_minute: 30, kwh: 2.5170058            },
    { utc_hour: 16, utc_minute:  0, kwh: 2.594162925          },
    { utc_hour: 16, utc_minute: 30, kwh: 3.465223775          },
    { utc_hour: 17, utc_minute:  0, kwh: 4.39798835           },
    { utc_hour: 17, utc_minute: 30, kwh: 4.543587025000001    },
    { utc_hour: 18, utc_minute:  0, kwh: 6.147934724999999    },
    { utc_hour: 18, utc_minute: 30, kwh: 6.3846525            },
    { utc_hour: 19, utc_minute:  0, kwh: 6.6786576250000005   },
    { utc_hour: 19, utc_minute: 30, kwh: 6.608934825          },
    { utc_hour: 20, utc_minute:  0, kwh: 6.595621775          },
    { utc_hour: 20, utc_minute: 30, kwh: 5.7452181            },
    { utc_hour: 21, utc_minute:  0, kwh: 4.9513318            },
    { utc_hour: 21, utc_minute: 30, kwh: 0.7272419            },
    { utc_hour: 22, utc_minute:  0, kwh: 0.7272419            },
    { utc_hour: 22, utc_minute: 30, kwh: 0.22156475           },
    { utc_hour: 23, utc_minute:  0, kwh: 0.22156475           },
    { utc_hour: 23, utc_minute: 30, kwh: 0.22156475           },
];
const HPS_CONSUMPTION_ARRAY_UTC_INJECTED = [];

const FS_CONSUMPTION_ARRAY_UTC_DEFAULT = [
    { utc_hour:  0, utc_minute:  0, kwh: 1.78   },
    { utc_hour:  0, utc_minute: 30, kwh: 1.765  },
    { utc_hour:  1, utc_minute:  0, kwh: 1.765  },
    { utc_hour:  1, utc_minute: 30, kwh: 1.765  },
    { utc_hour:  2, utc_minute:  0, kwh: 1.765  },
    { utc_hour:  2, utc_minute: 30, kwh: 1.765  },
    { utc_hour:  3, utc_minute:  0, kwh: 1.765  },
    { utc_hour:  3, utc_minute: 30, kwh: 1.765  },
    { utc_hour:  4, utc_minute:  0, kwh: 1.765  },
    { utc_hour:  4, utc_minute: 30, kwh: 1.765  },
    { utc_hour:  5, utc_minute:  0, kwh: 1.765  },
    { utc_hour:  5, utc_minute: 30, kwh: 1.765  },
    { utc_hour:  6, utc_minute:  0, kwh: 1.765  },
    { utc_hour:  6, utc_minute: 30, kwh: 1.765  },
    { utc_hour:  7, utc_minute:  0, kwh: 1.765  },
    { utc_hour:  7, utc_minute: 30, kwh: 1.765  },
    { utc_hour:  8, utc_minute:  0, kwh: 1.765  },
    { utc_hour:  8, utc_minute: 30, kwh: 1.765  },
    { utc_hour:  9, utc_minute:  0, kwh: 1.765  },
    { utc_hour:  9, utc_minute: 30, kwh: 1.82   },
    { utc_hour: 10, utc_minute:  0, kwh: 2      },
    { utc_hour: 10, utc_minute: 30, kwh: 2.06   },
    { utc_hour: 11, utc_minute:  0, kwh: 2.15   },
    { utc_hour: 11, utc_minute: 30, kwh: 2.375  },
    { utc_hour: 12, utc_minute:  0, kwh: 2.48   },
    { utc_hour: 12, utc_minute: 30, kwh: 2.54   },
    { utc_hour: 13, utc_minute:  0, kwh: 2.525  },
    { utc_hour: 13, utc_minute: 30, kwh: 2.36   },
    { utc_hour: 14, utc_minute:  0, kwh: 2.225  },
    { utc_hour: 14, utc_minute: 30, kwh: 2.285  },
    { utc_hour: 15, utc_minute:  0, kwh: 2.1    },
    { utc_hour: 15, utc_minute: 30, kwh: 2.08   },
    { utc_hour: 16, utc_minute:  0, kwh: 1.63   },
    { utc_hour: 16, utc_minute: 30, kwh: 1.565  },
    { utc_hour: 17, utc_minute:  0, kwh: 1.455  },
    { utc_hour: 17, utc_minute: 30, kwh: 1.76   },
    { utc_hour: 18, utc_minute:  0, kwh: 2.41   },
    { utc_hour: 18, utc_minute: 30, kwh: 2.75   },
    { utc_hour: 19, utc_minute:  0, kwh: 2.91   },
    { utc_hour: 19, utc_minute: 30, kwh: 3.125  },
    { utc_hour: 20, utc_minute:  0, kwh: 3.04   },
    { utc_hour: 20, utc_minute: 30, kwh: 3.04   },
    { utc_hour: 21, utc_minute:  0, kwh: 3.04   },
    { utc_hour: 21, utc_minute: 30, kwh: 2.885  },
    { utc_hour: 22, utc_minute:  0, kwh: 2.605  },
    { utc_hour: 22, utc_minute: 30, kwh: 2.429  },
    { utc_hour: 23, utc_minute:  0, kwh: 2.245  },
    { utc_hour: 23, utc_minute: 30, kwh: 2.09   },
];
const FS_CONSUMPTION_ARRAY_UTC_INJECTED = [];

const PRODUCTION_ARRAY_UTC_DEFAULT = [
    { utc_hour: 14, minute: 30, kwh:  0       },
    { utc_hour: 15, minute:  0, kwh:  4.086   },
    { utc_hour: 15, minute: 30, kwh:  2.979   },
    { utc_hour: 16, minute:  0, kwh:  1.773   },
    { utc_hour: 16, minute: 30, kwh:  0.72    },
    { utc_hour: 17, minute:  0, kwh:  0.045   },
    { utc_hour: 17, minute: 30, kwh:  0       },
    { utc_hour: 18, minute:  0, kwh:  0       },
    { utc_hour: 18, minute: 30, kwh:  0       },
    { utc_hour: 19, minute:  0, kwh:  0       },
    { utc_hour: 19, minute: 30, kwh:  0       },
    { utc_hour: 20, minute:  0, kwh:  0       },
    { utc_hour: 20, minute: 30, kwh:  0       },
    { utc_hour: 21, minute:  0, kwh:  0       },
    { utc_hour: 21, minute: 30, kwh:  0       },
    { utc_hour: 22, minute:  0, kwh:  0       },
    { utc_hour: 22, minute: 30, kwh:  0       },
    { utc_hour: 23, minute:  0, kwh:  0       },
    { utc_hour: 23, minute: 30, kwh:  0       },
    { utc_hour:  0, minute:  0, kwh:  0       },
    { utc_hour:  0, minute: 30, kwh:  0       },
    { utc_hour:  1, minute:  0, kwh:  0       },
    { utc_hour:  1, minute: 30, kwh:  0       },
    { utc_hour:  2, minute:  0, kwh:  0       },
    { utc_hour:  2, minute: 30, kwh:  0       },
    { utc_hour:  3, minute:  0, kwh:  0       },
    { utc_hour:  3, minute: 30, kwh:  0       },
    { utc_hour:  4, minute:  0, kwh:  0       },
    { utc_hour:  4, minute: 30, kwh:  0       },
    { utc_hour:  5, minute:  0, kwh:  0       },
    { utc_hour:  5, minute: 30, kwh:  0.018   },
    { utc_hour:  6, minute:  0, kwh:  0.7515  },
    { utc_hour:  6, minute: 30, kwh:  2.2905  },
    { utc_hour:  7, minute:  0, kwh:  4.347   },
    { utc_hour:  7, minute: 30, kwh:  6.354   },
    { utc_hour:  8, minute:  0, kwh:  8.235   },
    { utc_hour:  8, minute: 30, kwh:  9.828   },
    { utc_hour:  9, minute:  0, kwh: 11.043   },
    { utc_hour:  9, minute: 30, kwh: 11.8035  },
    { utc_hour: 10, minute:  0, kwh: 12.069   },
    { utc_hour: 10, minute: 30, kwh: 11.8755  },
    { utc_hour: 11, minute:  0, kwh: 11.5155  },
    { utc_hour: 11, minute: 30, kwh: 11.007   },
    { utc_hour: 12, minute:  0, kwh: 10.3995  },
    { utc_hour: 12, minute: 30, kwh:  9.747   },
    { utc_hour: 13, minute:  0, kwh:  8.865   },
    { utc_hour: 13, minute: 30, kwh:  7.6095  },
    { utc_hour: 14, minute:  0, kwh:  6.1469  },
    { utc_hour: 14, minute: 30, kwh:  4.59    },
];
const PRODUCTION_ARRAY_UTC_INJECTED = [];

const INITIAL_BATTERY_KWH = SOC_INJECTED * GRID_INJECTED.kwh;
const BATTERY_EFFICIENCY = 0.92;
const BATTERY_CAPACITY_KWH = GRID_INJECTED.kwh;
const SERIES_LENGTH = 48;
const HPS_WEIGHT_ARRAY = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 2, 2];
const FS_WEIGHT_ARRAY = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1, 1, 1, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 0.5];

function toLocalHour(datapoint, timezone) {
    const utcTime = moment.utc(moment({ hour: 0, minute: 0, second: 0, millisecond: 0 }));
    utcTime.hours(datapoint.utc_hour);
    utcTime.minutes((datapoint.utc_minute ?? datapoint.minute ?? datapoint.utc_min) || 0);
    const local = moment.tz(utcTime, timezone);
    return { kwh: datapoint.kwh, local_hour: local.hour(), local_minute: local.minute() };
}

function byHourMinute(a, b) {
    return a.utc_hour !== b.utc_hour
        ? a.utc_hour - b.utc_hour
        : (a.utc_min ?? a.minute ?? a.utc_minute) - (b.utc_min ?? b.minute ?? b.utc_minute);
}

function buildFSStateArray(length, initialState, startIndex, stopIndex) {
    if (startIndex < 0) { startIndex = 0; initialState = !initialState; }
    startIndex = Math.min(startIndex, length);
    stopIndex = Math.min(stopIndex, length);
    const noStop = stopIndex === startIndex;
    return Array.from({ length }, (_, i) => {
        const inIsland = noStop          ? i >= startIndex
            : stopIndex > startIndex     ? (i >= startIndex && i < stopIndex)
            : (i >= startIndex || i < stopIndex);
        return inIsland ? !initialState : initialState;
    });
}

function serviceAt(i, fsToggles, hpsToggles, initialFs, initialHps) {
    const fsPassed = fsToggles.filter(t => t >= 0 && i >= t).length;
    const fs = (fsPassed % 2 === 1) ? !initialFs : initialFs;
    const hpsPassed = hpsToggles.filter(t => t >= 0 && i >= t).length;
    const hps = (hpsPassed % 2 === 1) ? !initialHps : initialHps;
    return fs ? 'FS' : hps ? 'HPS' : 'OFF';
}

function run() {
    const NOWFIXED = { ...NOW_PARTS_INJECTED, minute: NOW_PARTS_INJECTED.utc_minute };
    const NOW = moment.utc(NOWFIXED).startOf('minute');
    const minutesToAdd = NOW.minutes() >= 30 ? 60 - NOW.minutes() : 30 - NOW.minutes();
    const nextHalfHourUTC = moment(NOW).add(minutesToAdd, 'minute');

    const hpsSource = HPS_CONSUMPTION_ARRAY_UTC_INJECTED?.length >= 48 ? HPS_CONSUMPTION_ARRAY_UTC_INJECTED : HPS_CONSUMPTION_ARRAY_UTC_DEFAULT;
    const fsSource  = FS_CONSUMPTION_ARRAY_UTC_INJECTED?.length  >= 48 ? FS_CONSUMPTION_ARRAY_UTC_INJECTED  : FS_CONSUMPTION_ARRAY_UTC_DEFAULT;
    const prodSource = PRODUCTION_ARRAY_UTC_INJECTED?.length     >= 48 ? PRODUCTION_ARRAY_UTC_INJECTED      : PRODUCTION_ARRAY_UTC_DEFAULT;

    const tz = GRID_INJECTED.timezone;
    const hpsLocal    = [...hpsSource].sort(byHourMinute).map(d => toLocalHour(d, tz));
    const fsBaseLocal = [...fsSource].sort(byHourMinute).map(d => toLocalHour(d, tz));
    const fsLocal     = hpsLocal.map((h, i) => ({ ...h, kwh: Math.max(h.kwh, fsBaseLocal[i].kwh) }));
    const prodLocal   = [...prodSource].sort(byHourMinute).map(d => toLocalHour(d, tz));

    const nextHalfHourLocal = moment.utc(nextHalfHourUTC.format('YYYY-MM-DD HH:mm:ss')).tz(tz);

    let hps = hpsLocal, fs = fsLocal, prod = prodLocal;
    if (ROTATE_ARRAYS_ENABLED) {
        const rotate = pipe(splitAt, reverse, flatten);
        const by = nextHalfHourUTC.hour() * 2 + (nextHalfHourUTC.minute() === 30 ? 1 : 0);
        hps  = rotate(by, hpsLocal);
        fs   = rotate(by, fsLocal);
        prod = rotate(by, prodLocal);
    }

    const initialFs  = (FS_TOGGLE_ARRAY_INJECTED[0] <= 0) ||
        ((FS_TOGGLE_ARRAY_INJECTED[0] > FS_TOGGLE_ARRAY_INJECTED[1]) && (FS_TOGGLE_ARRAY_INJECTED[1] > 0));
    const initialHps = GRID_INJECTED.is_hps_on || initialFs;
    const fsStateArray = buildFSStateArray(SERIES_LENGTH, initialFs, FS_TOGGLE_ARRAY_INJECTED[0], FS_TOGGLE_ARRAY_INJECTED[1]);

    const result = [];
    let prevBattery = INITIAL_BATTERY_KWH;

    for (let i = 0; i < SERIES_LENGTH; i++) {
        const service  = serviceAt(i, FS_TOGGLE_ARRAY_INJECTED, HPS_TOGGLE_ARRAY_INJECTED, initialFs, initialHps);
        const fsOn     = fsStateArray[i];
        const hpsKwh   = hps[i].kwh;
        const fsKwh    = fs[i].kwh;
        const prodKwh  = prod[i].kwh;

        const consumption          = service === 'FS' ? fsKwh : service === 'HPS' ? hpsKwh : 0.15;
        const productionAfterLoads = prodKwh - consumption;

        let batteryFlow = productionAfterLoads > 0
            ? productionAfterLoads * BATTERY_EFFICIENCY
            : productionAfterLoads / BATTERY_EFFICIENCY;
        let batteryConsumedProduction = productionAfterLoads > 0 ? productionAfterLoads : 0;

        let batteryEnd = batteryFlow / 2.0 + prevBattery;
        if (batteryEnd > BATTERY_CAPACITY_KWH) {
            batteryFlow = BATTERY_CAPACITY_KWH - prevBattery;
            batteryConsumedProduction = batteryFlow / BATTERY_EFFICIENCY;
            batteryEnd = BATTERY_CAPACITY_KWH;
        }
        if (batteryEnd < 0) {
            batteryFlow = -prevBattery;
            batteryEnd = 0;
        }

        const SOCEnd = Math.round(batteryEnd * 1000 / BATTERY_CAPACITY_KWH) / 1000;
        const excessProduction = productionAfterLoads - batteryConsumedProduction;
        const curtailmentHours = productionAfterLoads > 0 ? 0.5 * excessProduction / productionAfterLoads : 0;

        let uptime = 0;
        if (productionAfterLoads > 0) {
            uptime = 0.5;
        } else if (Math.abs(batteryFlow) > Math.abs(productionAfterLoads)) {
            uptime = 0.5;
        } else if (Math.abs(batteryFlow) > 0) {
            uptime = 0.5 * Math.abs(batteryFlow) * BATTERY_EFFICIENCY / Math.abs(productionAfterLoads);
        }

        const loadKwh = uptime > 0 ? consumption : 0;

        result.push({
            index: i,
            production_forecast_kwh:                prodKwh,
            production_forecast_kw:                 Math.round(prodKwh * 10) / 10 * 2,
            hps_consumption_forecast_potential_kwh: hpsKwh,
            fs_consumption_forecast_potential_kwh:  fsKwh,
            hps_consumption_forecast_actual_kwh:    hpsKwh,
            fs_consumption_forecast_actual_kwh:     fsKwh,
            fs_target_on:                           fsOn,
            initial_fs_state:                       initialFs,
            initial_hps_state:                      initialHps,
            fs_toggle_array:                        FS_TOGGLE_ARRAY_INJECTED,
            hps_toggle_array:                       HPS_TOGGLE_ARRAY_INJECTED,
            hps_uptime_weight_multiplier:           HPS_WEIGHT_ARRAY[i],
            fs_uptime_weight_multiplier:            FS_WEIGHT_ARRAY[i],
            requested_service:                      service,
            production_after_loads_kwh:             productionAfterLoads,
            battery_flow_kwh:                       batteryFlow,
            battery_consumed_production_kwh:        batteryConsumedProduction,
            battery_available_kwh_period_end:       batteryEnd,
            time_local_period_start:                moment(nextHalfHourLocal).add(i * 30, 'minutes'),
            time_local_period_end:                  moment(nextHalfHourLocal).add((i + 1) * 30, 'minutes'),
            battery_SOC_period_start:               prevBattery / BATTERY_CAPACITY_KWH,
            battery_SOC_period_end:                 SOCEnd,
            consumption_loads_all_power_kw:         loadKwh,
            consumption_loads_all_energy_kwh:       loadKwh,
            uptime_hps_hours_actual:                uptime,
            curtailment_hours:                      curtailmentHours,
            uptime_fs_hours_actual:                 fsOn ? uptime : 0,
            fs_is_on:                               uptime > 0 && fsOn ? 1 : 0,
            hps_only:                               uptime > 0 && !fsOn ? 1 : 0,
            no_service:                             uptime === 0 ? 1 : 0,
        });

        prevBattery = batteryEnd;
    }

    return result;
}

run();
`;
