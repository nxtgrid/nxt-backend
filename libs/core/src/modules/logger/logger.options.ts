import type { NxtConfig } from '#config/schema.js';
import { getConfig } from '#config/index.js';

/**
 * Soft default; override with `LOG_LEVEL` (e.g. `debug`, `warn`).
 * Not fail-fast — logging must not block boot the way secrets do.
 *
 * Used when nestjs-pino is restored via `GlobalLoggerModule` — see that module’s JSDoc.
 */
const DEFAULT_LOG_LEVEL = 'info';

interface PinoTransportTarget {
  target: string;
  level?: string;
  options?: Record<string, unknown>;
}

/**
 * Pretty-print only when `LOG_PRETTY` is a truthy env string (`1`, `true`, `yes`).
 * Off by default. Under webpack serve, pino transport workers need externals /
 * pino-webpack-plugin or pretty will log once and then stall.
 */
export function shouldPrettyPrint(): boolean {
  const prettyFlag = process.env.LOG_PRETTY?.trim().toLowerCase();
  return prettyFlag === '1' || prettyFlag === 'true' || prettyFlag === 'yes';
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
 * `pino-pretty` target when `LOG_PRETTY` is set.
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

/**
 * Options for nestjs-pino / pino-http — wire from `GlobalLoggerModule` on restore.
 * HTTP auto-logging stays off permanently unless product requirements change.
 */
export function buildPinoHttpOptions(config: NxtConfig = getConfig()): Record<string, unknown> {
  const level = process.env.LOG_LEVEL?.trim() || DEFAULT_LOG_LEVEL;
  const targets = assembleLogTransports(config);

  return {
    level,
    autoLogging: false,
    ...(targets.length > 0 ? { transport: { targets } } : {}),
  };
}
