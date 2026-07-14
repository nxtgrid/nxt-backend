import { Injectable } from '@nestjs/common';
import { getPackageInfo } from '@nxt/core';
import type { OrganizationTypeEnum } from '@nxt/core/types/supabase-types';

@Injectable()
export class HealthService {
  /** Golden-path probe: typecheck consumes generated Supabase types via @nxt/core subpath. */
  static readonly platformOperatorType =
    'PLATFORM_OPERATOR' satisfies OrganizationTypeEnum;

  getHealth(): { name: string; version: string } {
    return getPackageInfo();
  }
}
