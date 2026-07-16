import { Global, Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';

import { buildPinoHttpOptions } from './logger.options.js';

/**
 * Structured logging for Foundation hosts (`nestjs-pino` → JSON on stdout).
 *
 * Import early in each host’s `infrastructure` array so `PinoLogger` / `@InjectPinoLogger`
 * are available to Supabase and later Foundation modules. Wire as Nest’s logger in `main.ts`
 * (`bufferLogs: true` + `app.useLogger(app.get(Logger))`).
 *
 * Options: `LOG_LEVEL` (default `info`), pretty-print via `NODE_ENV` / `LOG_PRETTY`.
 * Transport list is config-assembled — see `assembleLogTransports` for Tier-3 Loki/Sentry slots.
 */
@Global()
@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: buildPinoHttpOptions(),
    }),
  ],
  exports: [ LoggerModule ],
})
export class GlobalLoggerModule {}
