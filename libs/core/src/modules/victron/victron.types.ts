/**
 * Victron VRM API Types
 *
 * Type definitions for the Victron VRM (Victron Remote Management) API.
 * These types are used for fetching device data, diagnostics, and stats
 * from Victron installations.
 */

import { WeatherTypeEnum } from '@core/types/supabase-types';

/**
 * Victron VRM attribute codes used for fetching stats.
 * These codes are used in the VRM API to request specific measurements.
 */
export type VictronAttributeCode =
  // Grid power consumption (total per phase, in W)
  | 'a1' | 'a2' | 'a3'
  // Grid power consumption (output per phase, in W)
  | 'o1' | 'o2' | 'o3'
  // Grid totals
  | 'total_consumption'
  // Battery metrics
  | 'bs'   // Battery SOC (%)
  | 'bc'   // Battery current (A)
  | 'bv'   // Battery voltage (V)
  | 'bst'  // Battery charging state (enum)
  | 'mcc'  // Max charge current limit (A)
  | 'I'    // Battery current (A)
  | 'McT'  // Min cell temperature (°C)
  | 'BT'   // Battery temperature (°C)
  | 'ca'   // Battery capacity (Ah)
  // PV metrics
  | 'Pdc'  // PV power DC (W)
  | 'Pb'   // PV energy to battery (kWh)
  | 'Pc'   // PV energy to grid (kWh)
  | 'PVP'  // PV power for MPPT
  | 'pP1'  // PV inverter power
  // Module status
  | 'mof'  // Modules off
  | 'mon'  // Modules on
  // Forecast attributes
  | 'vrm_consumption_fc'
  | 'solar_yield_forecast'
  // Phase count
  | 'PC';

/**
 * Map of VRM attribute codes to local field names.
 * Use this type when defining attribute maps for fetching stats.
 *
 * @example
 * ```typescript
 * const MEASUREMENTS: VictronAttributeMap = {
 *   'bs': 'battery_soc_pct',
 *   'bv': 'battery_voltage_v',
 * };
 * ```
 */
export type VictronAttributeMap = Partial<Record<VictronAttributeCode, string>>;

/**
 * Extracts keys from an attribute map with proper typing.
 * Use this instead of Object.keys() to maintain type safety.
 * @param attrMap - The attribute map to extract keys from
 * @returns Array of VictronAttributeCode keys
 */
export const getAttributeKeys = (attrMap: VictronAttributeMap): VictronAttributeCode[] =>
  Object.keys(attrMap) as VictronAttributeCode[];

/**
 * Device information returned by VRM API from /installations/{id}/system-overview
 */
export type VictronDevice = {
  /** Unique identifier for the device (e.g., gateway/Cerbo ID) */
  identifier: string;
  /** Device type name (e.g., 'Solar Charger', 'PV Inverter', 'VE.Bus System') */
  name: string;
  /** Custom name set by user in VRM portal */
  customName?: string;
  /** Instance ID for the device within the installation */
  instance: number;
  /** Unix timestamp of last connection */
  lastConnection: number;
};

/**
 * Diagnostic codes specific to VRM diagnostics endpoint.
 * These codes are used to identify specific diagnostic measurements.
 */
export type VictronDiagnosticCode =
  // Can also use stats attribute codes for diagnostics
  | VictronAttributeCode
  // VE.Bus system diagnostics
  | 'S'    // VE.Bus state (e.g., 'Inverting', 'Off', 'Absorption')
  | 'ERR'  // VE.Bus error
  // Alarm codes
  | 'eT'   // Quattro temperature alarm
  | 'eO'   // Quattro overload alarm
  | 'AHT'  // High battery temperature alarm
  | 'ACI'  // Cell imbalance alarm
  | 'AHC'  // High charge current alarm
  | 'AHCT' // High charge temperature alarm
  | 'AIE'  // Battery internal failure
  | 'Abc'  // Battery charge blocked
  | 'Abd'; // Battery discharge blocked

/**
 * Diagnostic entry returned by VRM API from /installations/{id}/diagnostics
 */
export type VictronDiagnostic = {
  /** Diagnostic code identifier */
  code: VictronDiagnosticCode;
  /** Raw numeric value of the diagnostic */
  rawValue: number;
  /** Human-readable formatted value (e.g., 'Inverting', 'No error', 'Ok', 'No alarm') */
  formattedValue: string;
  /** Unix timestamp when the diagnostic was recorded */
  timestamp: number;
};

/**
 * Weather icon values returned by VRM API from /installations/{id}/weather
 */
export type VictronWeatherIcon =
  | 'cloudy'
  | 'clouds'
  | 'showers'
  | 'sunny'
  | 'cloudy-with-rain';

/**
 * Weather data returned by VRM API
 */
export type VictronWeatherData = {
  icon?: VictronWeatherIcon;
};

/**
 * Mapping from Victron weather icons to internal WeatherTypeEnum values.
 */
export const VICTRON_WEATHER_ICON_MAP: Record<VictronWeatherIcon, WeatherTypeEnum> = {
  'cloudy': 'CLOUDY',
  'clouds': 'CLOUDS',
  'showers': 'SHOWERS',
  'sunny': 'SUNNY',
  'cloudy-with-rain': 'CLOUDY_WITH_RAIN',
};

export type VictronStats = Partial<Record<VictronAttributeCode, [ timestamp: number, measurement: number ][]>>

/**
 * Stats datapoint with dynamic fields based on attribute map values.
 * The generic parameter T is the attribute map type, and the resulting type
 * will have the mapped field names as keys with number | null values.
 *
 * Uses a distributive conditional to correctly handle union types.
 *
 * @template T - The attribute map type (e.g., { 'PVP': 'kw' })
 * @example
 * ```typescript
 * const MEASUREMENTS = { 'PVP': 'kw', 'bs': 'soc' } as const;
 * type MyDatapoint = VictronStatsDatapoint<typeof MEASUREMENTS>;
 * // Result: { created_at: Date; period_start: Date; kw: number | null; soc: number | null; }
 * ```
 */
export type VictronStatsDatapoint<T extends Record<string, string>> =
  T extends Record<string, string>
    ? {
        /** Timestamp of the datapoint */
        created_at: Date;
        /** Start of the measurement period */
        period_start: Date;
      } & {
        [K in T[keyof T]]: number | null;
      }
    : never;
