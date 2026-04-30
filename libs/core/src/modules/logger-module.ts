import { Global, Module } from '@nestjs/common';
import { LokiService } from './loki/loki.service';

@Global()
@Module({
  providers: [ LokiService ],
  exports: [ LokiService ],
})
export class CoreLoggerModule {}
