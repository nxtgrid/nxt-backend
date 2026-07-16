import { Injectable } from '@nestjs/common';
import { getPackageInfo } from '@nxt/core';
import type { Database } from '@nxt/core/types/supabase-types-adjusted';
import type { OrganizationTypeEnum } from '@nxt/core/types/supabase-types';

@Injectable()
export class HealthService {
  /** Golden-path probe: enums from generated subpath. */
  static readonly platformOperatorType =
    'PLATFORM_OPERATOR' satisfies OrganizationTypeEnum;

  /** Golden-path probe: Database from adjusted subpath (PostGIS geom typing). */
  static readonly gridGeomProbe = {
    type: 'Point',
    coordinates: [ 0, 0 ],
  } satisfies NonNullable<
    Database['public']['Tables']['grids']['Row']['location_geom']
  >;

  getHealth(): { name: string; version: string } {
    return getPackageInfo();
  }
}
