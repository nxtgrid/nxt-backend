import { Injectable, OnModuleInit } from '@nestjs/common';
import { createLogger, transports, format, Logger } from 'winston';
const LokiTransport = require('winston-loki');

@Injectable()
export class LokiService implements OnModuleInit{

  // Client
  private logger: Logger;

  onModuleInit() {
    this.logger = createLogger({
      transports: [ new LokiTransport({
        host: process.env.LOKI_URL,
        labels: { app: process.env.LOKI_APP_NAME },
        json: true,
        format: format.json(),
        replaceTimestamp: true,
        onConnectionError: err => {
          console.error(err);
        },
      }),
      new transports.Console({
        format: format.combine(format.simple(), format.colorize()),
      }) ],
    });
  }

  public log(level: 'error' | 'warn' | 'debug' | 'info' | 'log', message: string, labels?: any) {
    if (!this.logger) return;

    this.logger.log(level, { message, labels: { content: JSON.stringify(labels) } });
  }
}
