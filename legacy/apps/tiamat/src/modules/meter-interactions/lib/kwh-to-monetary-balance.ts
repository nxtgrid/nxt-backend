import { MeterTypeEnum } from '@core/types/supabase-types';
import { round } from '@helpers/number-helpers';

interface MeterForTariffCheck {
  id: number;
  meter_type: MeterTypeEnum;
  kwh_tariff: number;
  connection: {
    customer: {
      grid: {
        uses_dual_meter_setup: boolean;
        kwh_tariff_essential_service: number;
        kwh_tariff_full_service: number;
      }
    }
  }
}

export const kwhToMonetaryBalance = (meter: MeterForTariffCheck, kwh: number) => {
  if(!meter.connection) return null;
  const { connection: { customer: { grid } } } = meter;

  // If the tariff is set at meter level, use that to infer the balance of the meter
  if (meter.kwh_tariff) return round(kwh * meter.kwh_tariff, 2);

  // Otherwise, use grid-level tariff
  const gridLevelTariff = grid.uses_dual_meter_setup
    ? meter.meter_type === 'HPS'
      ? grid.kwh_tariff_essential_service
      : grid.kwh_tariff_full_service
    : grid.kwh_tariff_essential_service;

  if (isNaN(gridLevelTariff) || gridLevelTariff === 0) {
    console.warn(`[METER SERVICE] Could not calculate monetary balance from kWh for meter with ID ${ meter.id } because of missing tariffs`);
    return null;
  }

  return round(kwh * gridLevelTariff, 2);
};
