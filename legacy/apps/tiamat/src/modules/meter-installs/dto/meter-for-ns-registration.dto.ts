import { MeterPhaseEnum } from '@core/types/supabase-types';

export type MeterForNsRegistration = {
  external_reference: string;
  meter_phase: MeterPhaseEnum;
  dcu_external_reference?: string;
}

export type MeterForNsDeregistration = {
  external_reference: string;
  dcu_external_reference?: string;
}
