import { SolcastRequestType } from '@core/types/solcast-type';

export class CreateSolcastCacheDto {

  request_type: SolcastRequestType;

  latitude: number;

  longitude: number;

  tilt: number;

  azimuth: number;

  capacity_kwp: number;

  install_date: string;

  response: string;
}
