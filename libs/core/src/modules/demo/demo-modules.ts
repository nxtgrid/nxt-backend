import type { DynamicModule, Type } from '@nestjs/common';

import { requireEnv } from '#config/require-env.js';
import type { NxtConfig } from '#config/schema.js';
import { DemoModule } from './demo.module.js';

/**
 * Demo capability contribution function — the pattern every later capability copies
 * (ADR-007 decision 7). Proves the three Tier-1 honesty behaviors (decision 8):
 *
 * - flag off (default) → module not instantiated (returns `[]`)
 * - flag on → module loads
 * - flag on + its declared env var missing → boot blocks with `MISSING …`
 *
 * Temporary scaffolding: delete alongside the rest of `modules/demo/` once a real Tier-1
 * capability demonstrates the same pattern (002c decisions log, 2026-07-14).
 */
export function demoModules(config: NxtConfig): Array<Type | DynamicModule> {
  if (!config.capabilities.demo?.enabled) {
    return [];
  }

  requireEnv('DEMO_REQUIRED_TOKEN');

  return [ DemoModule ];
}
