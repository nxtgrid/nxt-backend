import { CurrencyEnum, ExternalSystemEnum, IdDocumentTypeEnum, MeterPhaseEnum, MeterTypeEnum } from '@core/types/supabase-types';

export class RequestedMeterDto {
  meter_type: MeterTypeEnum;
  meter_phase: MeterPhaseEnum;
  fee: number;
}

export class CreateConnectionDto {
  customer_id: number;
  upload_uuid: string;
  external_system: ExternalSystemEnum;
  document_type: IdDocumentTypeEnum;
  document_id: string;
  paid: number;
  currency: CurrencyEnum;
  requested_meters: RequestedMeterDto[];

  is_public: boolean;
  is_commercial: boolean;
  is_residential: boolean;
  is_using_led_bulbs: boolean;
  is_building_wired: boolean;
  women_impacted: number;
}
