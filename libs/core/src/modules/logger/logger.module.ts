import { Global, Module } from '@nestjs/common';

/**
 * Logging slot for Foundation hosts.
 *
 * **Current:** no-op. Hosts use Nest’s built-in `Logger` and free `console.*`.
 * `nestjs-pino` is deferred: under `nx serve` (webpack), pino transport workers
 * break pretty logging (“one line then silence”), and pino-http / pretty ANSI
 * fight quick `console` debugging.
 *
 * Keep this module in each host’s `infrastructure` array so restore is one place.
 *
 * **Restore nestjs-pino:**
 * 1. Re-add deps on `@nxt/core`: `nestjs-pino`, `pino-http`; optional `pino-pretty`.
 * 2. Replace this module body with:
 *    `LoggerModule.forRootAsync({ useFactory: () => ({ pinoHttp: buildPinoHttpOptions() }) })`
 *    — option builders live in `./logger.options.ts` (`autoLogging: false`,
 *    `LOG_PRETTY` opt-in only).
 * 3. Host `main.ts`: `bufferLogs: true` + `app.useLogger(app.get(Logger))`
 *    (re-export nestjs-pino `Logger` from `@nxt/core` if useful).
 * 4. Services that need DI logging: `PinoLogger` + `setContext` (not
 *    `@InjectPinoLogger(name)` — token snapshot race with barrel/module order).
 * 5. Before enabling pretty under webpack: externals / `pino-webpack-plugin`
 *    so transport workers resolve.
 */
@Global()
@Module({})
export class GlobalLoggerModule {}
