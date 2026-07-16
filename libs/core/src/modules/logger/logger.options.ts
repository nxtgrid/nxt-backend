import type { NxtConfig } from '#config/schema.js';
import { getConfig } from '#config/index.js';
// Import peer dependency 'pino-http' for linting pass
import type {} from 'pino-http';

/**
 * Soft default; override with `LOG_LEVEL` (e.g. `debug`, `warn`).
 * Not fail-fast — logging must not block boot the way secrets do.
 */
const DEFAULT_LOG_LEVEL = 'info';

interface PinoTransportTarget {
  target: string;
  level?: string;
  options?: Record<string, unknown>;
}

/**
 * Pretty-print when not production, or when `LOG_PRETTY` is a truthy env string
 * (`1`, `true`, `yes`). Production images ship JSON to stdout; `pino-pretty` is a
 * devDependency and is only loaded on this path.
 */
export function shouldPrettyPrint(): boolean {
  const prettyFlag = process.env.LOG_PRETTY?.trim().toLowerCase();
  if (prettyFlag === '1' || prettyFlag === 'true' || prettyFlag === 'yes') {
    return true;
  }
  if (prettyFlag === '0' || prettyFlag === 'false' || prettyFlag === 'no') {
    return false;
  }
  return process.env.NODE_ENV !== 'production';
}

/**
 * Assembles pino transport targets from deployment config + env.
 *
 * **Tier-3 slots (unbuilt — document only):**
 * - `integrations.loki` + `LOKI_URL` — dedicated Loki push transport (later).
 *   Free path today: ship structured JSON on stdout and let the platform scrape it
 *   (“Loki-via-stdout”).
 * - `integrations.sentry` + `SENTRY_DSN` — Sentry transport / SDK (later).
 *
 * Until those integration flags exist on the schema, this only adds the optional
 * `pino-pretty` target for local/dev readability.
 */
export function assembleLogTransports(config: NxtConfig = getConfig()): PinoTransportTarget[] {
  const targets: PinoTransportTarget[] = [];
  const { integrations } = config;

  // Tier-3 — Loki (deferred): when `integrations.loki` lands on the schema —
  // if (integrations.loki?.enabled && process.env.LOKI_URL) { … push Loki target }

  // Tier-3 — Sentry (deferred): when `integrations.sentry` lands on the schema —
  // if (integrations.sentry?.enabled && process.env.SENTRY_DSN) { … push Sentry target }

  void integrations;

  if (shouldPrettyPrint()) {
    targets.push({
      target: 'pino-pretty',
      options: {
        colorize: true,
        singleLine: true,
        translateTime: 'SYS:standard',
      },
    });
  }

  return targets;
}

/** Options passed to nestjs-pino / pino-http. */
export function buildPinoHttpOptions(config: NxtConfig = getConfig()): Record<string, unknown> {
  const level = process.env.LOG_LEVEL?.trim() || DEFAULT_LOG_LEVEL;
  const targets = assembleLogTransports(config);

  return {
    level,
    ...(targets.length > 0 ? { transport: { targets } } : {}),
  };
}
