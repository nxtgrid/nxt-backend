export class AutopilotMatrixInput {
  series_length: number;
  current_fs_state: boolean;
  initial_battery_kwh: number;
  battery_efficiency: number;
  battery_capacity_kwh: number;
  production_forecast_array: number[];
  hps_consumption_array: number[];
  fs_consumption_array: number[];
}
